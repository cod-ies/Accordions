"""
AI-Enhanced Todo Service with Parallel Processing
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
import logging

from models.todo import (
    Todo, TodoCreate, TodoUpdate, TodoResponse, 
    TaskStatus, TaskPriority, TaskCategory, AIMetadata,
    BatchProcessingResult
)
from ai.nlp_processor import NLPProcessor, ParsedTaskInfo
from core.parallel_processor import ParallelProcessor
from database import get_db

logger = logging.getLogger(__name__)


class AITodoService:
    """
    Advanced AI-powered Todo service with parallel processing capabilities
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.nlp_processor = NLPProcessor(openai_api_key)
        self.parallel_processor = ParallelProcessor[Todo, TodoResponse](
            max_workers=4,
            batch_size=20,
            max_concurrent_batches=3
        )
        
    async def create_ai_enhanced_todo(
        self, 
        raw_input: str, 
        user_id: str,
        db: Session,
        project_id: Optional[str] = None
    ) -> TodoResponse:
        """
        Create a todo using AI-enhanced natural language processing
        """
        try:
            # Parse natural language input
            parsed_info = await self.nlp_processor.parse_natural_language_task(raw_input)
            
            # Generate AI metadata
            ai_metadata = await self.nlp_processor.generate_ai_metadata(raw_input, parsed_info)
            
            # Create todo object
            todo_data = TodoCreate(
                title=parsed_info.title,
                description=parsed_info.description,
                priority=parsed_info.priority,
                category=parsed_info.category,
                due_date=parsed_info.due_date,
                user_id=user_id,
                project_id=project_id,
                tags=parsed_info.tags,
                raw_input=raw_input
            )
            
            # Create database record
            db_todo = Todo(
                title=todo_data.title,
                description=todo_data.description,
                priority=todo_data.priority.value if todo_data.priority else TaskPriority.MEDIUM.value,
                category=todo_data.category.value if todo_data.category else None,
                due_date=todo_data.due_date,
                user_id=todo_data.user_id,
                project_id=todo_data.project_id,
                tags=json.dumps(todo_data.tags) if todo_data.tags else None,
                ai_metadata=ai_metadata.dict(),
                auto_generated=True,
                ai_priority_score=self._calculate_ai_priority_score(parsed_info, ai_metadata),
                estimated_duration=self._estimate_duration(parsed_info),
                complexity_score=self._calculate_complexity_score(parsed_info, ai_metadata)
            )
            
            db.add(db_todo)
            db.commit()
            db.refresh(db_todo)
            
            logger.info(f"Created AI-enhanced todo {db_todo.id} for user {user_id}")
            return self._todo_to_response(db_todo)
            
        except Exception as e:
            logger.error(f"Error creating AI-enhanced todo: {e}")
            db.rollback()
            raise
    
    async def batch_create_todos(
        self,
        todo_inputs: List[str],
        user_id: str,
        db: Session,
        project_id: Optional[str] = None
    ) -> BatchProcessingResult:
        """
        Create multiple todos in parallel using AI processing
        """
        async def process_single_todo(raw_input: str) -> TodoResponse:
            return await self.create_ai_enhanced_todo(raw_input, user_id, db, project_id)
        
        return await self.parallel_processor.process_parallel_async(
            todo_inputs,
            process_single_todo
        )
    
    async def batch_update_todos(
        self,
        todo_updates: List[Tuple[int, TodoUpdate]],
        db: Session
    ) -> BatchProcessingResult:
        """
        Update multiple todos in parallel
        """
        async def process_single_update(update_data: Tuple[int, TodoUpdate]) -> TodoResponse:
            todo_id, update = update_data
            return await self.update_todo(todo_id, update, db)
        
        return await self.parallel_processor.process_parallel_async(
            todo_updates,
            process_single_update
        )
    
    async def update_todo(
        self,
        todo_id: int,
        todo_update: TodoUpdate,
        db: Session
    ) -> TodoResponse:
        """
        Update a todo with AI enhancements
        """
        try:
            db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
            if not db_todo:
                raise ValueError(f"Todo {todo_id} not found")
            
            # Update fields
            update_data = todo_update.dict(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(db_todo, field):
                    if field in ['priority', 'status', 'category'] and value:
                        setattr(db_todo, field, value.value)
                    elif field == 'tags' and value:
                        setattr(db_todo, field, json.dumps(value))
                    else:
                        setattr(db_todo, field, value)
            
            # Update timestamp
            db_todo.updated_at = datetime.utcnow()
            
            # Mark as completed if status changed to completed
            if todo_update.status == TaskStatus.COMPLETED and not db_todo.completed_at:
                db_todo.completed_at = datetime.utcnow()
            
            db.commit()
            db.refresh(db_todo)
            
            return self._todo_to_response(db_todo)
            
        except Exception as e:
            logger.error(f"Error updating todo {todo_id}: {e}")
            db.rollback()
            raise
    
    async def intelligent_search(
        self,
        query: str,
        user_id: str,
        db: Session,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[TodoResponse]:
        """
        AI-powered intelligent search and filtering
        """
        try:
            # Parse search query using NLP
            parsed_query = await self.nlp_processor.parse_natural_language_task(query)
            
            # Build base query
            base_query = db.query(Todo).filter(Todo.user_id == user_id)
            
            # Apply AI-enhanced filters
            if parsed_query.category:
                base_query = base_query.filter(Todo.category == parsed_query.category.value)
            
            if parsed_query.priority:
                base_query = base_query.filter(Todo.priority == parsed_query.priority.value)
            
            if parsed_query.due_date:
                # Search for todos due around the parsed date
                date_range = timedelta(days=1)
                base_query = base_query.filter(
                    and_(
                        Todo.due_date >= parsed_query.due_date - date_range,
                        Todo.due_date <= parsed_query.due_date + date_range
                    )
                )
            
            # Text search in title and description
            search_terms = parsed_query.title.split() + (parsed_query.tags or [])
            if search_terms:
                text_conditions = []
                for term in search_terms:
                    text_conditions.extend([
                        Todo.title.ilike(f"%{term}%"),
                        Todo.description.ilike(f"%{term}%")
                    ])
                base_query = base_query.filter(or_(*text_conditions))
            
            # Apply additional filters
            if filters:
                if 'status' in filters:
                    base_query = base_query.filter(Todo.status == filters['status'])
                if 'project_id' in filters:
                    base_query = base_query.filter(Todo.project_id == filters['project_id'])
                if 'min_priority_score' in filters:
                    base_query = base_query.filter(Todo.ai_priority_score >= filters['min_priority_score'])
            
            # Order by relevance (AI priority score and recency)
            todos = base_query.order_by(
                desc(Todo.ai_priority_score),
                desc(Todo.created_at)
            ).limit(100).all()
            
            return [self._todo_to_response(todo) for todo in todos]
            
        except Exception as e:
            logger.error(f"Error in intelligent search: {e}")
            raise
    
    async def get_ai_recommendations(
        self,
        user_id: str,
        db: Session,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generate AI-powered task recommendations
        """
        try:
            # Get user's todos for analysis
            user_todos = db.query(Todo).filter(
                and_(
                    Todo.user_id == user_id,
                    Todo.status != TaskStatus.COMPLETED
                )
            ).all()
            
            recommendations = []
            
            # Overdue tasks recommendation
            overdue_todos = [
                todo for todo in user_todos 
                if todo.due_date and todo.due_date < datetime.utcnow()
            ]
            if overdue_todos:
                recommendations.append({
                    "type": "overdue_tasks",
                    "priority": "high",
                    "message": f"You have {len(overdue_todos)} overdue tasks",
                    "todos": [self._todo_to_response(todo) for todo in overdue_todos[:5]]
                })
            
            # High priority tasks
            high_priority_todos = [
                todo for todo in user_todos
                if todo.priority in [TaskPriority.HIGH.value, TaskPriority.URGENT.value]
                and todo.status == TaskStatus.PENDING.value
            ]
            if high_priority_todos:
                recommendations.append({
                    "type": "high_priority",
                    "priority": "medium",
                    "message": f"Focus on {len(high_priority_todos)} high-priority tasks",
                    "todos": [self._todo_to_response(todo) for todo in high_priority_todos[:3]]
                })
            
            # Due soon tasks
            tomorrow = datetime.utcnow() + timedelta(days=1)
            due_soon_todos = [
                todo for todo in user_todos
                if todo.due_date and todo.due_date <= tomorrow and todo.due_date > datetime.utcnow()
            ]
            if due_soon_todos:
                recommendations.append({
                    "type": "due_soon",
                    "priority": "medium",
                    "message": f"{len(due_soon_todos)} tasks due soon",
                    "todos": [self._todo_to_response(todo) for todo in due_soon_todos]
                })
            
            # Quick wins (low complexity, high impact)
            quick_wins = [
                todo for todo in user_todos
                if todo.complexity_score < 0.3 and todo.ai_priority_score > 0.7
            ][:3]
            if quick_wins:
                recommendations.append({
                    "type": "quick_wins",
                    "priority": "low",
                    "message": "Quick wins to boost productivity",
                    "todos": [self._todo_to_response(todo) for todo in quick_wins]
                })
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error generating AI recommendations: {e}")
            return []
    
    def _calculate_ai_priority_score(self, parsed_info: ParsedTaskInfo, ai_metadata: AIMetadata) -> float:
        """Calculate AI-based priority score"""
        score = 0.5  # Base score
        
        # Priority boost
        priority_scores = {
            TaskPriority.LOW: 0.2,
            TaskPriority.MEDIUM: 0.5,
            TaskPriority.HIGH: 0.8,
            TaskPriority.URGENT: 1.0
        }
        score += priority_scores.get(parsed_info.priority, 0.5) * 0.4
        
        # Due date urgency
        if parsed_info.due_date:
            days_until_due = (parsed_info.due_date - datetime.utcnow()).days
            if days_until_due <= 0:
                score += 0.3  # Overdue
            elif days_until_due <= 1:
                score += 0.2  # Due today/tomorrow
            elif days_until_due <= 7:
                score += 0.1  # Due this week
        
        # Confidence boost
        score += ai_metadata.confidence_score * 0.1
        
        return min(score, 1.0)
    
    def _estimate_duration(self, parsed_info: ParsedTaskInfo) -> int:
        """Estimate task duration in minutes"""
        # Simple heuristic based on title length and complexity indicators
        base_duration = 30  # 30 minutes base
        
        title_words = len(parsed_info.title.split())
        if title_words > 5:
            base_duration += title_words * 5
        
        # Check for complexity indicators
        complex_keywords = ['research', 'analyze', 'design', 'develop', 'create', 'write']
        if any(keyword in parsed_info.title.lower() for keyword in complex_keywords):
            base_duration *= 2
        
        return min(base_duration, 480)  # Max 8 hours
    
    def _calculate_complexity_score(self, parsed_info: ParsedTaskInfo, ai_metadata: AIMetadata) -> float:
        """Calculate task complexity score"""
        score = 0.3  # Base complexity
        
        # Title length indicator
        title_words = len(parsed_info.title.split())
        score += min(title_words * 0.05, 0.3)
        
        # Description complexity
        if parsed_info.description:
            desc_words = len(parsed_info.description.split())
            score += min(desc_words * 0.01, 0.2)
        
        # Entity complexity
        entity_count = sum(len(entities) for entities in ai_metadata.extracted_entities.values())
        score += min(entity_count * 0.05, 0.2)
        
        return min(score, 1.0)
    
    def _todo_to_response(self, todo: Todo) -> TodoResponse:
        """Convert Todo model to TodoResponse"""
        return TodoResponse(
            id=todo.id,
            title=todo.title,
            description=todo.description,
            status=TaskStatus(todo.status),
            priority=TaskPriority(todo.priority),
            category=todo.category,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
            due_date=todo.due_date,
            completed_at=todo.completed_at,
            ai_metadata=todo.ai_metadata,
            auto_generated=todo.auto_generated,
            ai_priority_score=todo.ai_priority_score,
            estimated_duration=todo.estimated_duration,
            complexity_score=todo.complexity_score,
            user_id=todo.user_id,
            project_id=todo.project_id,
            tags=json.loads(todo.tags) if todo.tags else []
        )
