"""
Parallel Processing Engine for Todo Management System
"""
import asyncio
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from typing import List, Dict, Any, Callable, Optional, Union, TypeVar, Generic
from dataclasses import dataclass
from functools import wraps
import logging
from models.todo import Todo, BatchProcessingResult, TodoResponse
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

T = TypeVar('T')
R = TypeVar('R')


@dataclass
class ProcessingBatch:
    """Represents a batch of items to be processed"""
    batch_id: str
    items: List[T]
    batch_size: int
    created_at: float

    def __post_init__(self):
        if not self.batch_id:
            self.batch_id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = time.time()


@dataclass
class ProcessingResult:
    """Result of processing a single item"""
    item_id: Any
    success: bool
    result: Any = None
    error: Optional[str] = None
    processing_time: float = 0.0


class ParallelProcessor(Generic[T, R]):
    """
    Advanced parallel processing engine for todo operations
    Supports both async and sync processing with intelligent batching
    """
    
    def __init__(
        self,
        max_workers: int = 4,
        batch_size: int = 10,
        max_concurrent_batches: int = 3,
        use_process_pool: bool = False,
        timeout_seconds: int = 300
    ):
        self.max_workers = max_workers
        self.batch_size = batch_size
        self.max_concurrent_batches = max_concurrent_batches
        self.use_process_pool = use_process_pool
        self.timeout_seconds = timeout_seconds
        
        # Initialize executors
        if use_process_pool:
            self.executor = ProcessPoolExecutor(max_workers=max_workers)
        else:
            self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # Processing statistics
        self.stats = {
            'total_processed': 0,
            'total_batches': 0,
            'average_batch_time': 0.0,
            'error_rate': 0.0
        }
    
    def create_batches(self, items: List[T], custom_batch_size: Optional[int] = None) -> List[ProcessingBatch[T]]:
        """
        Intelligently partition items into batches for parallel processing
        """
        effective_batch_size = custom_batch_size or self.batch_size
        
        # Adaptive batch sizing based on item count
        if len(items) < effective_batch_size:
            effective_batch_size = max(1, len(items) // 2)
        elif len(items) > effective_batch_size * 10:
            # For large datasets, increase batch size slightly
            effective_batch_size = min(effective_batch_size * 2, len(items) // self.max_workers)
        
        batches = []
        for i in range(0, len(items), effective_batch_size):
            batch_items = items[i:i + effective_batch_size]
            batch = ProcessingBatch(
                batch_id=str(uuid.uuid4()),
                items=batch_items,
                batch_size=len(batch_items),
                created_at=time.time()
            )
            batches.append(batch)
        
        logger.info(f"Created {len(batches)} batches with average size {effective_batch_size}")
        return batches
    
    async def process_batch_async(
        self,
        batch: ProcessingBatch[T],
        processor_func: Callable[[T], R],
        **kwargs
    ) -> List[ProcessingResult]:
        """
        Process a single batch asynchronously
        """
        start_time = time.time()
        results = []
        
        try:
            # Create semaphore to limit concurrent operations within batch
            semaphore = asyncio.Semaphore(self.max_workers)
            
            async def process_item(item: T) -> ProcessingResult:
                async with semaphore:
                    item_start = time.time()
                    try:
                        # If processor_func is async
                        if asyncio.iscoroutinefunction(processor_func):
                            result = await processor_func(item, **kwargs)
                        else:
                            # Run sync function in thread pool
                            loop = asyncio.get_event_loop()
                            result = await loop.run_in_executor(
                                self.executor, processor_func, item
                            )
                        
                        return ProcessingResult(
                            item_id=getattr(item, 'id', str(item)),
                            success=True,
                            result=result,
                            processing_time=time.time() - item_start
                        )
                    except Exception as e:
                        logger.error(f"Error processing item {getattr(item, 'id', str(item))}: {e}")
                        return ProcessingResult(
                            item_id=getattr(item, 'id', str(item)),
                            success=False,
                            error=str(e),
                            processing_time=time.time() - item_start
                        )
            
            # Process all items in the batch concurrently
            tasks = [process_item(item) for item in batch.items]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle any exceptions from gather
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    processed_results.append(ProcessingResult(
                        item_id=getattr(batch.items[i], 'id', str(batch.items[i])),
                        success=False,
                        error=str(result),
                        processing_time=0.0
                    ))
                else:
                    processed_results.append(result)
            
            processing_time = time.time() - start_time
            logger.info(f"Batch {batch.batch_id} processed in {processing_time:.2f}s")
            
            return processed_results
            
        except Exception as e:
            logger.error(f"Critical error processing batch {batch.batch_id}: {e}")
            # Return error results for all items in batch
            return [
                ProcessingResult(
                    item_id=getattr(item, 'id', str(item)),
                    success=False,
                    error=f"Batch processing failed: {str(e)}",
                    processing_time=0.0
                )
                for item in batch.items
            ]
    
    def process_batch_sync(
        self,
        batch: ProcessingBatch[T],
        processor_func: Callable[[T], R],
        **kwargs
    ) -> List[ProcessingResult]:
        """
        Process a single batch synchronously using thread/process pool
        """
        start_time = time.time()
        results = []
        
        def process_item_wrapper(item: T) -> ProcessingResult:
            item_start = time.time()
            try:
                result = processor_func(item, **kwargs)
                return ProcessingResult(
                    item_id=getattr(item, 'id', str(item)),
                    success=True,
                    result=result,
                    processing_time=time.time() - item_start
                )
            except Exception as e:
                logger.error(f"Error processing item {getattr(item, 'id', str(item))}: {e}")
                return ProcessingResult(
                    item_id=getattr(item, 'id', str(item)),
                    success=False,
                    error=str(e),
                    processing_time=time.time() - item_start
                )
        
        try:
            # Submit all items to executor
            future_to_item = {
                self.executor.submit(process_item_wrapper, item): item
                for item in batch.items
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_item, timeout=self.timeout_seconds):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    item = future_to_item[future]
                    results.append(ProcessingResult(
                        item_id=getattr(item, 'id', str(item)),
                        success=False,
                        error=str(e),
                        processing_time=0.0
                    ))
            
            processing_time = time.time() - start_time
            logger.info(f"Batch {batch.batch_id} processed in {processing_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Critical error processing batch {batch.batch_id}: {e}")
            # Return error results for remaining items
            for item in batch.items:
                if not any(r.item_id == getattr(item, 'id', str(item)) for r in results):
                    results.append(ProcessingResult(
                        item_id=getattr(item, 'id', str(item)),
                        success=False,
                        error=f"Batch processing failed: {str(e)}",
                        processing_time=0.0
                    ))
        
        return results
    
    async def process_parallel_async(
        self,
        items: List[T],
        processor_func: Callable[[T], R],
        custom_batch_size: Optional[int] = None,
        **kwargs
    ) -> BatchProcessingResult:
        """
        Process items in parallel using async approach
        """
        if not items:
            return BatchProcessingResult(
                total_processed=0,
                successful=0,
                failed=0,
                processing_time=0.0,
                batch_id=str(uuid.uuid4())
            )
        
        start_time = time.time()
        batches = self.create_batches(items, custom_batch_size)
        all_results = []
        
        # Process batches with concurrency limit
        semaphore = asyncio.Semaphore(self.max_concurrent_batches)
        
        async def process_batch_with_semaphore(batch: ProcessingBatch[T]) -> List[ProcessingResult]:
            async with semaphore:
                return await self.process_batch_async(batch, processor_func, **kwargs)
        
        # Process all batches
        batch_tasks = [process_batch_with_semaphore(batch) for batch in batches]
        batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
        
        # Flatten results
        for batch_result in batch_results:
            if isinstance(batch_result, Exception):
                logger.error(f"Batch processing exception: {batch_result}")
                continue
            all_results.extend(batch_result)
        
        # Calculate statistics
        total_processed = len(all_results)
        successful = sum(1 for r in all_results if r.success)
        failed = total_processed - successful
        processing_time = time.time() - start_time
        
        # Update internal stats
        self._update_stats(total_processed, len(batches), processing_time, failed / total_processed if total_processed > 0 else 0)
        
        # Collect successful results
        successful_results = [r.result for r in all_results if r.success and r.result]
        
        # Collect errors
        errors = [
            {"item_id": r.item_id, "error": r.error}
            for r in all_results if not r.success
        ]
        
        return BatchProcessingResult(
            total_processed=total_processed,
            successful=successful,
            failed=failed,
            errors=errors,
            processing_time=processing_time,
            batch_id=str(uuid.uuid4()),
            results=successful_results if isinstance(successful_results[0], TodoResponse) if successful_results else []
        )
    
    def process_parallel_sync(
        self,
        items: List[T],
        processor_func: Callable[[T], R],
        custom_batch_size: Optional[int] = None,
        **kwargs
    ) -> BatchProcessingResult:
        """
        Process items in parallel using synchronous approach
        """
        if not items:
            return BatchProcessingResult(
                total_processed=0,
                successful=0,
                failed=0,
                processing_time=0.0,
                batch_id=str(uuid.uuid4())
            )
        
        start_time = time.time()
        batches = self.create_batches(items, custom_batch_size)
        all_results = []
        
        # Process batches sequentially (each batch processes items in parallel)
        for batch in batches:
            batch_results = self.process_batch_sync(batch, processor_func, **kwargs)
            all_results.extend(batch_results)
        
        # Calculate statistics
        total_processed = len(all_results)
        successful = sum(1 for r in all_results if r.success)
        failed = total_processed - successful
        processing_time = time.time() - start_time
        
        # Update internal stats
        self._update_stats(total_processed, len(batches), processing_time, failed / total_processed if total_processed > 0 else 0)
        
        # Collect successful results
        successful_results = [r.result for r in all_results if r.success and r.result]
        
        # Collect errors
        errors = [
            {"item_id": r.item_id, "error": r.error}
            for r in all_results if not r.success
        ]
        
        return BatchProcessingResult(
            total_processed=total_processed,
            successful=successful,
            failed=failed,
            errors=errors,
            processing_time=processing_time,
            batch_id=str(uuid.uuid4()),
            results=successful_results if successful_results and isinstance(successful_results[0], TodoResponse) else []
        )
    
    def _update_stats(self, processed: int, batches: int, time_taken: float, error_rate: float):
        """Update internal processing statistics"""
        self.stats['total_processed'] += processed
        self.stats['total_batches'] += batches
        
        # Update average batch time
        if self.stats['total_batches'] > 0:
            total_time = self.stats['average_batch_time'] * (self.stats['total_batches'] - batches) + time_taken
            self.stats['average_batch_time'] = total_time / self.stats['total_batches']
        
        # Update error rate (exponential moving average)
        alpha = 0.1
        self.stats['error_rate'] = alpha * error_rate + (1 - alpha) * self.stats['error_rate']
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return self.stats.copy()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.executor.shutdown(wait=True)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.executor.shutdown(wait=True)
