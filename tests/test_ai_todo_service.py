"""
Tests for AI-Enhanced Todo Service
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.todo import Base, Todo, TaskStatus, TaskPriority, TaskCategory
from services.ai_todo_service import AITodoService
from database import get_db

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ai_todo.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture
def db_session():
    """Create a test database session"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def ai_service():
    """Create AI service instance for testing"""
    return AITodoService()


@pytest.mark.asyncio
async def test_create_ai_enhanced_todo(ai_service, db_session):
    """Test AI-enhanced todo creation"""
    raw_input = "Schedule a meeting with the client tomorrow at 2 PM to discuss the project requirements"
    user_id = "test_user_123"
    
    result = await ai_service.create_ai_enhanced_todo(
        raw_input=raw_input,
        user_id=user_id,
        db=db_session
    )
    
    assert result.title is not None
    assert len(result.title) > 0
    assert result.user_id == user_id
    assert result.auto_generated is True
    assert result.ai_metadata is not None
    assert result.ai_priority_score >= 0.0
    assert result.ai_priority_score <= 1.0


@pytest.mark.asyncio
async def test_batch_create_todos(ai_service, db_session):
    """Test batch creation of todos"""
    todo_inputs = [
        "Buy groceries for the week",
        "Call mom to check on her health",
        "Finish the quarterly report by Friday",
        "Schedule dentist appointment",
        "Review and approve the marketing proposal"
    ]
    user_id = "test_user_batch"
    
    result = await ai_service.batch_create_todos(
        todo_inputs=todo_inputs,
        user_id=user_id,
        db=db_session
    )
    
    assert result.total_processed == len(todo_inputs)
    assert result.successful > 0
    assert result.processing_time > 0
    assert len(result.results) > 0


@pytest.mark.asyncio
async def test_intelligent_search(ai_service, db_session):
    """Test AI-powered search functionality"""
    # First create some test todos
    test_todos = [
        "Complete the Python project documentation",
        "Schedule team meeting for next week",
        "Buy birthday gift for Sarah",
        "Review code changes in the main branch",
        "Plan vacation for summer holidays"
    ]
    
    user_id = "test_user_search"
    
    # Create todos
    for todo_input in test_todos:
        await ai_service.create_ai_enhanced_todo(
            raw_input=todo_input,
            user_id=user_id,
            db=db_session
        )
    
    # Test search
    search_results = await ai_service.intelligent_search(
        query="project work development",
        user_id=user_id,
        db=db_session
    )
    
    assert len(search_results) > 0
    # Should find todos related to project/work
    found_relevant = any("project" in todo.title.lower() or "code" in todo.title.lower() 
                        for todo in search_results)
    assert found_relevant


@pytest.mark.asyncio
async def test_ai_recommendations(ai_service, db_session):
    """Test AI recommendation system"""
    user_id = "test_user_recommendations"
    
    # Create test todos with different priorities and due dates
    test_scenarios = [
        ("Urgent: Fix critical bug in production", TaskPriority.URGENT, datetime.utcnow() - timedelta(hours=1)),
        ("High priority: Prepare presentation for board meeting", TaskPriority.HIGH, datetime.utcnow() + timedelta(days=1)),
        ("Review team performance", TaskPriority.MEDIUM, datetime.utcnow() + timedelta(days=7)),
        ("Organize desk space", TaskPriority.LOW, None)
    ]
    
    for title, priority, due_date in test_scenarios:
        # Create todo directly in database for testing
        todo = Todo(
            title=title,
            priority=priority.value,
            due_date=due_date,
            user_id=user_id,
            status=TaskStatus.PENDING.value,
            ai_priority_score=0.8 if priority == TaskPriority.URGENT else 0.5,
            complexity_score=0.3,
            auto_generated=False
        )
        db_session.add(todo)
    
    db_session.commit()
    
    # Get recommendations
    recommendations = await ai_service.get_ai_recommendations(
        user_id=user_id,
        db=db_session,
        limit=10
    )
    
    assert len(recommendations) > 0
    
    # Should have overdue tasks recommendation
    overdue_rec = next((r for r in recommendations if r["type"] == "overdue_tasks"), None)
    assert overdue_rec is not None
    
    # Should have high priority recommendation
    high_priority_rec = next((r for r in recommendations if r["type"] == "high_priority"), None)
    assert high_priority_rec is not None


@pytest.mark.asyncio
async def test_update_todo(ai_service, db_session):
    """Test todo update functionality"""
    # Create a todo first
    result = await ai_service.create_ai_enhanced_todo(
        raw_input="Test todo for updating",
        user_id="test_user_update",
        db=db_session
    )
    
    todo_id = result.id
    
    # Update the todo
    from models.todo import TodoUpdate
    update_data = TodoUpdate(
        title="Updated test todo",
        status=TaskStatus.IN_PROGRESS,
        priority=TaskPriority.HIGH
    )
    
    updated_todo = await ai_service.update_todo(
        todo_id=todo_id,
        todo_update=update_data,
        db=db_session
    )
    
    assert updated_todo.title == "Updated test todo"
    assert updated_todo.status == TaskStatus.IN_PROGRESS
    assert updated_todo.priority == TaskPriority.HIGH
    assert updated_todo.updated_at > updated_todo.created_at


def test_priority_score_calculation(ai_service):
    """Test AI priority score calculation"""
    from ai.nlp_processor import ParsedTaskInfo
    from models.todo import AIMetadata
    
    # High priority task
    high_priority_info = ParsedTaskInfo(
        title="Urgent: Fix critical system bug",
        priority=TaskPriority.URGENT,
        due_date=datetime.utcnow() + timedelta(hours=2),
        confidence_score=0.9
    )
    
    ai_metadata = AIMetadata(
        confidence_score=0.9,
        sentiment_score=0.1,
        keywords=["urgent", "critical", "bug"],
        extracted_entities={"ORG": ["system"]}
    )
    
    score = ai_service._calculate_ai_priority_score(high_priority_info, ai_metadata)
    assert score > 0.8  # Should be high priority score
    
    # Low priority task
    low_priority_info = ParsedTaskInfo(
        title="Organize bookshelf when free",
        priority=TaskPriority.LOW,
        due_date=None,
        confidence_score=0.5
    )
    
    low_ai_metadata = AIMetadata(
        confidence_score=0.5,
        sentiment_score=0.0,
        keywords=["organize"],
        extracted_entities={}
    )
    
    low_score = ai_service._calculate_ai_priority_score(low_priority_info, low_ai_metadata)
    assert low_score < 0.5  # Should be low priority score


def test_duration_estimation(ai_service):
    """Test task duration estimation"""
    from ai.nlp_processor import ParsedTaskInfo
    
    # Simple task
    simple_task = ParsedTaskInfo(title="Call John")
    duration = ai_service._estimate_duration(simple_task)
    assert duration <= 60  # Should be short
    
    # Complex task
    complex_task = ParsedTaskInfo(title="Research and analyze market trends for Q4 strategy development")
    complex_duration = ai_service._estimate_duration(complex_task)
    assert complex_duration > duration  # Should be longer


def test_complexity_score_calculation(ai_service):
    """Test complexity score calculation"""
    from ai.nlp_processor import ParsedTaskInfo
    from models.todo import AIMetadata
    
    # Simple task
    simple_info = ParsedTaskInfo(title="Buy milk")
    simple_metadata = AIMetadata(
        confidence_score=0.8,
        extracted_entities={}
    )
    
    simple_score = ai_service._calculate_complexity_score(simple_info, simple_metadata)
    assert simple_score < 0.5
    
    # Complex task
    complex_info = ParsedTaskInfo(
        title="Develop comprehensive machine learning model for customer behavior prediction",
        description="This involves data collection, preprocessing, feature engineering, model selection, training, validation, and deployment with monitoring systems."
    )
    complex_metadata = AIMetadata(
        confidence_score=0.7,
        extracted_entities={
            "TECH": ["machine learning", "model"],
            "PROCESS": ["data collection", "preprocessing", "training"]
        }
    )
    
    complex_score = ai_service._calculate_complexity_score(complex_info, complex_metadata)
    assert complex_score > simple_score


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
