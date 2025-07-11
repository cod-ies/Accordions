"""
AI-Enhanced Todo Data Models
"""
from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class TaskStatus(str, Enum):
    """Task status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"


class TaskPriority(str, Enum):
    """Task priority enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskCategory(str, Enum):
    """Task category enumeration"""
    WORK = "work"
    PERSONAL = "personal"
    HEALTH = "health"
    FINANCE = "finance"
    EDUCATION = "education"
    SHOPPING = "shopping"
    TRAVEL = "travel"
    OTHER = "other"


class AIMetadata(BaseModel):
    """AI processing metadata"""
    confidence_score: float = Field(ge=0.0, le=1.0)
    extracted_entities: Dict[str, Any] = Field(default_factory=dict)
    sentiment_score: float = Field(ge=-1.0, le=1.0, default=0.0)
    keywords: List[str] = Field(default_factory=list)
    suggested_tags: List[str] = Field(default_factory=list)
    processing_timestamp: datetime = Field(default_factory=datetime.utcnow)


class TaskRelationship(Base):
    """Task relationship model for dependencies and subtasks"""
    __tablename__ = "task_relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    parent_task_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    child_task_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # "dependency", "subtask"
    created_at = Column(DateTime, default=datetime.utcnow)


class Todo(Base):
    """Enhanced Todo model with AI capabilities"""
    __tablename__ = "todos"
    
    # Core fields
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    status = Column(String(20), default=TaskStatus.PENDING, index=True)
    priority = Column(String(20), default=TaskPriority.MEDIUM, index=True)
    category = Column(String(50), index=True)
    
    # Temporal fields
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    due_date = Column(DateTime, index=True)
    completed_at = Column(DateTime)
    
    # AI-enhanced fields
    ai_metadata = Column(JSON)  # Stores AIMetadata as JSON
    auto_generated = Column(Boolean, default=False)
    ai_priority_score = Column(Float, default=0.0)
    estimated_duration = Column(Integer)  # in minutes
    complexity_score = Column(Float, default=0.0)
    
    # User and project association
    user_id = Column(String(100), index=True)
    project_id = Column(String(100), index=True)
    tags = Column(JSON)  # List of tags as JSON
    
    # Relationships
    parent_relationships = relationship(
        "TaskRelationship",
        foreign_keys=[TaskRelationship.parent_task_id],
        backref="parent_task"
    )
    child_relationships = relationship(
        "TaskRelationship",
        foreign_keys=[TaskRelationship.child_task_id],
        backref="child_task"
    )


class TodoCreate(BaseModel):
    """Pydantic model for creating todos"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM
    category: Optional[TaskCategory] = None
    due_date: Optional[datetime] = None
    user_id: str
    project_id: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    raw_input: Optional[str] = None  # For AI processing


class TodoUpdate(BaseModel):
    """Pydantic model for updating todos"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    category: Optional[TaskCategory] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None


class TodoResponse(BaseModel):
    """Pydantic model for todo responses"""
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    category: Optional[str]
    created_at: datetime
    updated_at: datetime
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    ai_metadata: Optional[Dict[str, Any]]
    auto_generated: bool
    ai_priority_score: float
    estimated_duration: Optional[int]
    complexity_score: float
    user_id: str
    project_id: Optional[str]
    tags: Optional[List[str]]
    
    class Config:
        from_attributes = True


class BatchProcessingResult(BaseModel):
    """Result model for batch processing operations"""
    total_processed: int
    successful: int
    failed: int
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    processing_time: float
    batch_id: str
    results: List[TodoResponse] = Field(default_factory=list)
