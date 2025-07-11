"""
AI-Enhanced Todo Management API
"""
import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from models.todo import (
    TodoCreate, TodoUpdate, TodoResponse, BatchProcessingResult,
    TaskStatus, TaskPriority, TaskCategory
)
from services.ai_todo_service import AITodoService
from database import engine, get_db
from models.todo import Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AI service
ai_todo_service = AITodoService(openai_api_key=os.getenv("OPENAI_API_KEY"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting AI-Enhanced Todo Management API")
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    logger.info("Shutting down AI-Enhanced Todo Management API")


app = FastAPI(
    title="AI-Enhanced Todo Management API",
    description="Advanced todo management with AI-powered features and parallel processing",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI-Enhanced Todo Management API",
        "version": "1.0.0",
        "features": [
            "Natural Language Processing",
            "Smart Task Creation",
            "Parallel Processing",
            "AI Recommendations",
            "Intelligent Search"
        ]
    }


@app.post("/todos/ai-create", response_model=TodoResponse)
async def create_ai_todo(
    raw_input: str,
    user_id: str,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Create a todo using AI-enhanced natural language processing
    
    - **raw_input**: Natural language description of the task
    - **user_id**: User identifier
    - **project_id**: Optional project identifier
    """
    try:
        return await ai_todo_service.create_ai_enhanced_todo(
            raw_input=raw_input,
            user_id=user_id,
            db=db,
            project_id=project_id
        )
    except Exception as e:
        logger.error(f"Error creating AI todo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/todos/batch-create", response_model=BatchProcessingResult)
async def batch_create_todos(
    todo_inputs: List[str],
    user_id: str,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Create multiple todos in parallel using AI processing
    
    - **todo_inputs**: List of natural language task descriptions
    - **user_id**: User identifier
    - **project_id**: Optional project identifier
    """
    try:
        if len(todo_inputs) > 100:
            raise HTTPException(
                status_code=400, 
                detail="Maximum 100 todos can be created in a single batch"
            )
        
        return await ai_todo_service.batch_create_todos(
            todo_inputs=todo_inputs,
            user_id=user_id,
            db=db,
            project_id=project_id
        )
    except Exception as e:
        logger.error(f"Error in batch create: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: int,
    todo_update: TodoUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a specific todo
    
    - **todo_id**: Todo identifier
    - **todo_update**: Updated todo data
    """
    try:
        return await ai_todo_service.update_todo(
            todo_id=todo_id,
            todo_update=todo_update,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating todo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/todos/search", response_model=List[TodoResponse])
async def intelligent_search(
    query: str,
    user_id: str,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    category: Optional[TaskCategory] = None,
    project_id: Optional[str] = None,
    min_priority_score: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    AI-powered intelligent search and filtering
    
    - **query**: Natural language search query
    - **user_id**: User identifier
    - **status**: Filter by task status
    - **priority**: Filter by task priority
    - **category**: Filter by task category
    - **project_id**: Filter by project
    - **min_priority_score**: Minimum AI priority score
    """
    try:
        filters = {}
        if status:
            filters['status'] = status.value
        if priority:
            filters['priority'] = priority.value
        if category:
            filters['category'] = category.value
        if project_id:
            filters['project_id'] = project_id
        if min_priority_score is not None:
            filters['min_priority_score'] = min_priority_score
        
        return await ai_todo_service.intelligent_search(
            query=query,
            user_id=user_id,
            db=db,
            filters=filters
        )
    except Exception as e:
        logger.error(f"Error in intelligent search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/todos/recommendations", response_model=List[Dict[str, Any]])
async def get_ai_recommendations(
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get AI-powered task recommendations
    
    - **user_id**: User identifier
    - **limit**: Maximum number of recommendations
    """
    try:
        if limit > 50:
            limit = 50  # Cap at 50 recommendations
        
        return await ai_todo_service.get_ai_recommendations(
            user_id=user_id,
            db=db,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/todos/{todo_id}", response_model=TodoResponse)
async def get_todo(todo_id: int, db: Session = Depends(get_db)):
    """
    Get a specific todo by ID
    
    - **todo_id**: Todo identifier
    """
    try:
        from models.todo import Todo
        todo = db.query(Todo).filter(Todo.id == todo_id).first()
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        return ai_todo_service._todo_to_response(todo)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting todo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/todos", response_model=List[TodoResponse])
async def list_todos(
    user_id: str,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    category: Optional[TaskCategory] = None,
    project_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List todos with filtering options
    
    - **user_id**: User identifier
    - **status**: Filter by task status
    - **priority**: Filter by task priority
    - **category**: Filter by task category
    - **project_id**: Filter by project
    - **limit**: Maximum number of results
    - **offset**: Number of results to skip
    """
    try:
        from models.todo import Todo
        from sqlalchemy import and_, desc
        
        query = db.query(Todo).filter(Todo.user_id == user_id)
        
        if status:
            query = query.filter(Todo.status == status.value)
        if priority:
            query = query.filter(Todo.priority == priority.value)
        if category:
            query = query.filter(Todo.category == category.value)
        if project_id:
            query = query.filter(Todo.project_id == project_id)
        
        todos = query.order_by(
            desc(Todo.ai_priority_score),
            desc(Todo.created_at)
        ).offset(offset).limit(min(limit, 1000)).all()
        
        return [ai_todo_service._todo_to_response(todo) for todo in todos]
        
    except Exception as e:
        logger.error(f"Error listing todos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/todos/{todo_id}")
async def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    """
    Delete a specific todo
    
    - **todo_id**: Todo identifier
    """
    try:
        from models.todo import Todo
        todo = db.query(Todo).filter(Todo.id == todo_id).first()
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        db.delete(todo)
        db.commit()
        
        return {"message": f"Todo {todo_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting todo: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-07-11T00:00:00Z",
        "services": {
            "database": "connected",
            "ai_processor": "ready",
            "parallel_processor": "ready"
        }
    }


@app.get("/stats")
async def get_processing_stats():
    """Get parallel processing statistics"""
    return {
        "parallel_processor_stats": ai_todo_service.parallel_processor.get_stats(),
        "service_info": {
            "max_workers": ai_todo_service.parallel_processor.max_workers,
            "batch_size": ai_todo_service.parallel_processor.batch_size,
            "max_concurrent_batches": ai_todo_service.parallel_processor.max_concurrent_batches
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
