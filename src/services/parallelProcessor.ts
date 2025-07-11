import { v4 as uuidv4 } from 'uuid';

export interface ProcessingBatch<T> {
  batchId: string;
  items: T[];
  batchSize: number;
  createdAt: number;
}

export interface ProcessingResult<R> {
  itemId: string;
  success: boolean;
  result?: R;
  error?: string;
  processingTime: number;
}

export interface BatchProcessingResult<R> {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
  processingTime: number;
  batchId: string;
  results: R[];
}

export interface ProcessingStats {
  totalProcessed: number;
  totalBatches: number;
  averageBatchTime: number;
  errorRate: number;
  throughputPerSecond: number;
}

export class ParallelProcessor<T, R> {
  private maxWorkers: number;
  private batchSize: number;
  private maxConcurrentBatches: number;
  private timeoutMs: number;
  private stats: ProcessingStats;

  constructor(options: {
    maxWorkers?: number;
    batchSize?: number;
    maxConcurrentBatches?: number;
    timeoutMs?: number;
  } = {}) {
    this.maxWorkers = options.maxWorkers || 4;
    this.batchSize = options.batchSize || 10;
    this.maxConcurrentBatches = options.maxConcurrentBatches || 3;
    this.timeoutMs = options.timeoutMs || 30000; // 30 seconds

    this.stats = {
      totalProcessed: 0,
      totalBatches: 0,
      averageBatchTime: 0,
      errorRate: 0,
      throughputPerSecond: 0,
    };
  }

  /**
   * Create batches from items for parallel processing
   */
  createBatches(items: T[], customBatchSize?: number): ProcessingBatch<T>[] {
    const effectiveBatchSize = customBatchSize || this.batchSize;
    const batches: ProcessingBatch<T>[] = [];

    // Adaptive batch sizing
    let adaptedBatchSize = effectiveBatchSize;
    if (items.length < effectiveBatchSize) {
      adaptedBatchSize = Math.max(1, Math.ceil(items.length / 2));
    } else if (items.length > effectiveBatchSize * 10) {
      adaptedBatchSize = Math.min(effectiveBatchSize * 2, Math.ceil(items.length / this.maxWorkers));
    }

    for (let i = 0; i < items.length; i += adaptedBatchSize) {
      const batchItems = items.slice(i, i + adaptedBatchSize);
      batches.push({
        batchId: uuidv4(),
        items: batchItems,
        batchSize: batchItems.length,
        createdAt: Date.now(),
      });
    }

    return batches;
  }

  /**
   * Process a single batch with concurrency control
   */
  private async processBatch<T, R>(
    batch: ProcessingBatch<T>,
    processorFn: (item: T) => Promise<R>,
    getItemId: (item: T) => string = (item) => String(item)
  ): Promise<ProcessingResult<R>[]> {
    const startTime = Date.now();
    const results: ProcessingResult<R>[] = [];

    // Create a semaphore to limit concurrent operations within the batch
    const semaphore = new Semaphore(this.maxWorkers);

    const processItem = async (item: T): Promise<ProcessingResult<R>> => {
      const itemStartTime = Date.now();
      const itemId = getItemId(item);

      try {
        await semaphore.acquire();
        
        // Add timeout to individual item processing
        const result = await Promise.race([
          processorFn(item),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Processing timeout')), this.timeoutMs)
          )
        ]);

        return {
          itemId,
          success: true,
          result,
          processingTime: Date.now() - itemStartTime,
        };
      } catch (error) {
        return {
          itemId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          processingTime: Date.now() - itemStartTime,
        };
      } finally {
        semaphore.release();
      }
    };

    try {
      // Process all items in the batch concurrently
      const itemPromises = batch.items.map(processItem);
      const itemResults = await Promise.allSettled(itemPromises);

      // Handle settled promises
      itemResults.forEach((settledResult, index) => {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          results.push({
            itemId: getItemId(batch.items[index]),
            success: false,
            error: settledResult.reason?.message || 'Unknown error',
            processingTime: 0,
          });
        }
      });

      const processingTime = Date.now() - startTime;
      console.log(`Batch ${batch.batchId} processed in ${processingTime}ms`);

      return results;
    } catch (error) {
      console.error(`Critical error processing batch ${batch.batchId}:`, error);
      
      // Return error results for all items in batch
      return batch.items.map(item => ({
        itemId: getItemId(item),
        success: false,
        error: `Batch processing failed: ${error instanceof Error ? error.message : String(error)}`,
        processingTime: 0,
      }));
    }
  }

  /**
   * Process items in parallel with intelligent batching
   */
  async processParallel(
    items: T[],
    processorFn: (item: T) => Promise<R>,
    options: {
      customBatchSize?: number;
      getItemId?: (item: T) => string;
    } = {}
  ): Promise<BatchProcessingResult<R>> {
    if (items.length === 0) {
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        processingTime: 0,
        batchId: uuidv4(),
        results: [],
      };
    }

    const startTime = Date.now();
    const batches = this.createBatches(items, options.customBatchSize);
    const allResults: ProcessingResult<R>[] = [];

    // Process batches with concurrency limit
    const batchSemaphore = new Semaphore(this.maxConcurrentBatches);
    
    const processBatchWithSemaphore = async (batch: ProcessingBatch<T>) => {
      try {
        await batchSemaphore.acquire();
        return await this.processBatch(batch, processorFn, options.getItemId);
      } finally {
        batchSemaphore.release();
      }
    };

    try {
      // Process all batches
      const batchPromises = batches.map(processBatchWithSemaphore);
      const batchResults = await Promise.allSettled(batchPromises);

      // Flatten results
      batchResults.forEach((settledResult) => {
        if (settledResult.status === 'fulfilled') {
          allResults.push(...settledResult.value);
        } else {
          console.error('Batch processing failed:', settledResult.reason);
        }
      });

      // Calculate statistics
      const totalProcessed = allResults.length;
      const successful = allResults.filter(r => r.success).length;
      const failed = totalProcessed - successful;
      const processingTime = Date.now() - startTime;

      // Update internal stats
      this.updateStats(totalProcessed, batches.length, processingTime, failed / totalProcessed);

      // Collect successful results and errors
      const successfulResults = allResults
        .filter(r => r.success && r.result !== undefined)
        .map(r => r.result as R);

      const errors = allResults
        .filter(r => !r.success)
        .map(r => ({ itemId: r.itemId, error: r.error || 'Unknown error' }));

      return {
        totalProcessed,
        successful,
        failed,
        errors,
        processingTime,
        batchId: uuidv4(),
        results: successfulResults,
      };
    } catch (error) {
      console.error('Critical error in parallel processing:', error);
      throw error;
    }
  }

  /**
   * Process items with retry logic
   */
  async processWithRetry(
    items: T[],
    processorFn: (item: T) => Promise<R>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      customBatchSize?: number;
      getItemId?: (item: T) => string;
    } = {}
  ): Promise<BatchProcessingResult<R>> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    let currentItems = [...items];
    let allSuccessfulResults: R[] = [];
    let finalErrors: Array<{ itemId: string; error: string }> = [];
    let totalProcessingTime = 0;

    for (let attempt = 0; attempt <= maxRetries && currentItems.length > 0; attempt++) {
      const result = await this.processParallel(currentItems, processorFn, options);
      
      totalProcessingTime += result.processingTime;
      allSuccessfulResults.push(...result.results);

      if (attempt === maxRetries) {
        // Final attempt, collect remaining errors
        finalErrors.push(...result.errors);
      } else if (result.failed > 0) {
        // Prepare failed items for retry
        const failedItemIds = new Set(result.errors.map(e => e.itemId));
        currentItems = currentItems.filter(item => 
          failedItemIds.has(options.getItemId ? options.getItemId(item) : String(item))
        );

        if (currentItems.length > 0) {
          console.log(`Retrying ${currentItems.length} failed items (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      } else {
        // All items processed successfully
        break;
      }
    }

    return {
      totalProcessed: items.length,
      successful: allSuccessfulResults.length,
      failed: finalErrors.length,
      errors: finalErrors,
      processingTime: totalProcessingTime,
      batchId: uuidv4(),
      results: allSuccessfulResults,
    };
  }

  /**
   * Update processing statistics
   */
  private updateStats(processed: number, batches: number, timeTaken: number, errorRate: number): void {
    this.stats.totalProcessed += processed;
    this.stats.totalBatches += batches;

    // Update average batch time
    if (this.stats.totalBatches > 0) {
      const totalTime = this.stats.averageBatchTime * (this.stats.totalBatches - batches) + timeTaken;
      this.stats.averageBatchTime = totalTime / this.stats.totalBatches;
    }

    // Update error rate (exponential moving average)
    const alpha = 0.1;
    this.stats.errorRate = alpha * errorRate + (1 - alpha) * this.stats.errorRate;

    // Calculate throughput
    this.stats.throughputPerSecond = processed / (timeTaken / 1000);
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      totalBatches: 0,
      averageBatchTime: 0,
      errorRate: 0,
      throughputPerSecond: 0,
    };
  }
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

export default ParallelProcessor;
