"""
Demonstration script for AI-Enhanced Todo Management System
"""
import asyncio
import json
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from models.todo import Base
from services.ai_todo_service import AITodoService
from database import get_db

# Setup demo database
engine = create_engine("sqlite:///./demo_ai_todo.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def get_demo_db():
    """Get demo database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Don't close here for demo


async def demo_ai_enhanced_todo_creation():
    """Demonstrate AI-enhanced todo creation"""
    print("\n🤖 AI-Enhanced Todo Creation Demo")
    print("=" * 50)
    
    ai_service = AITodoService()
    db = get_demo_db()
    
    # Sample natural language inputs
    sample_inputs = [
        "Schedule a meeting with the client tomorrow at 2 PM to discuss project requirements",
        "Buy groceries including milk, bread, and eggs for the weekend",
        "Urgent: Fix the critical bug in the payment system ASAP",
        "Call mom to check on her health and see how she's doing",
        "Research and analyze market trends for Q4 strategy development",
        "Book flight tickets for the business trip to New York next month",
        "Review and approve the marketing proposal by end of week",
        "Schedule dentist appointment for routine checkup",
        "Prepare presentation for the board meeting on Friday",
        "Organize team building event for next quarter"
    ]
    
    print(f"Creating {len(sample_inputs)} todos using AI processing...\n")
    
    for i, raw_input in enumerate(sample_inputs, 1):
        try:
            print(f"{i}. Processing: '{raw_input[:60]}...'")
            
            result = await ai_service.create_ai_enhanced_todo(
                raw_input=raw_input,
                user_id="demo_user",
                db=db
            )
            
            print(f"   ✅ Created: {result.title}")
            print(f"   📊 Priority: {result.priority.value} | Category: {result.category or 'None'}")
            print(f"   🎯 AI Score: {result.ai_priority_score:.2f} | Complexity: {result.complexity_score:.2f}")
            if result.due_date:
                print(f"   📅 Due: {result.due_date.strftime('%Y-%m-%d %H:%M')}")
            if result.tags:
                print(f"   🏷️  Tags: {', '.join(result.tags)}")
            print()
            
        except Exception as e:
            print(f"   ❌ Error: {e}\n")
    
    db.close()


async def demo_batch_processing():
    """Demonstrate batch processing capabilities"""
    print("\n⚡ Batch Processing Demo")
    print("=" * 50)
    
    ai_service = AITodoService()
    db = get_demo_db()
    
    batch_inputs = [
        "Send weekly status report to the team",
        "Update project documentation with latest changes",
        "Review code changes in the main repository",
        "Schedule one-on-one meetings with team members",
        "Prepare agenda for the upcoming sprint planning",
        "Test the new feature in staging environment",
        "Update dependencies in the project",
        "Write unit tests for the new API endpoints",
        "Deploy the latest version to production",
        "Monitor system performance after deployment"
    ]
    
    print(f"Processing {len(batch_inputs)} todos in parallel...\n")
    
    start_time = datetime.now()
    
    try:
        result = await ai_service.batch_create_todos(
            todo_inputs=batch_inputs,
            user_id="demo_batch_user",
            db=db
        )
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        print(f"📊 Batch Processing Results:")
        print(f"   Total Processed: {result.total_processed}")
        print(f"   Successful: {result.successful}")
        print(f"   Failed: {result.failed}")
        print(f"   Processing Time: {result.processing_time:.2f} seconds")
        print(f"   Actual Time: {processing_time:.2f} seconds")
        print(f"   Average per item: {result.processing_time/result.total_processed:.2f}s")
        
        if result.errors:
            print(f"\n❌ Errors encountered:")
            for error in result.errors:
                print(f"   - Item {error['item_id']}: {error['error']}")
        
        print(f"\n✅ Successfully created {result.successful} todos!")
        
    except Exception as e:
        print(f"❌ Batch processing failed: {e}")
    
    db.close()


async def demo_intelligent_search():
    """Demonstrate intelligent search capabilities"""
    print("\n🔍 Intelligent Search Demo")
    print("=" * 50)
    
    ai_service = AITodoService()
    db = get_demo_db()
    
    # Search queries to test
    search_queries = [
        "project work development",
        "meeting schedule client",
        "urgent important tasks",
        "health medical appointment",
        "shopping buy groceries"
    ]
    
    for query in search_queries:
        print(f"🔎 Searching for: '{query}'")
        
        try:
            results = await ai_service.intelligent_search(
                query=query,
                user_id="demo_user",
                db=db
            )
            
            print(f"   Found {len(results)} matching todos:")
            for result in results[:3]:  # Show top 3 results
                print(f"   - {result.title} (Score: {result.ai_priority_score:.2f})")
            
            if len(results) > 3:
                print(f"   ... and {len(results) - 3} more")
            print()
            
        except Exception as e:
            print(f"   ❌ Search failed: {e}\n")
    
    db.close()


async def demo_ai_recommendations():
    """Demonstrate AI recommendation system"""
    print("\n💡 AI Recommendations Demo")
    print("=" * 50)
    
    ai_service = AITodoService()
    db = get_demo_db()
    
    try:
        recommendations = await ai_service.get_ai_recommendations(
            user_id="demo_user",
            db=db,
            limit=5
        )
        
        if recommendations:
            print(f"📋 Generated {len(recommendations)} recommendations:\n")
            
            for i, rec in enumerate(recommendations, 1):
                print(f"{i}. {rec['type'].replace('_', ' ').title()}")
                print(f"   Priority: {rec['priority']}")
                print(f"   Message: {rec['message']}")
                
                if 'todos' in rec and rec['todos']:
                    print(f"   Related todos:")
                    for todo in rec['todos'][:2]:  # Show first 2 todos
                        print(f"   - {todo.title}")
                print()
        else:
            print("No recommendations available at this time.")
            
    except Exception as e:
        print(f"❌ Failed to get recommendations: {e}")
    
    db.close()


async def demo_processing_stats():
    """Show processing statistics"""
    print("\n📈 Processing Statistics")
    print("=" * 50)
    
    ai_service = AITodoService()
    stats = ai_service.parallel_processor.get_stats()
    
    print(f"Total Processed: {stats['total_processed']}")
    print(f"Total Batches: {stats['total_batches']}")
    print(f"Average Batch Time: {stats['average_batch_time']:.2f}s")
    print(f"Error Rate: {stats['error_rate']:.2%}")
    
    print(f"\nProcessor Configuration:")
    print(f"Max Workers: {ai_service.parallel_processor.max_workers}")
    print(f"Batch Size: {ai_service.parallel_processor.batch_size}")
    print(f"Max Concurrent Batches: {ai_service.parallel_processor.max_concurrent_batches}")


async def main():
    """Run all demonstrations"""
    print("🚀 AI-Enhanced Todo Management System Demo")
    print("=" * 60)
    print("This demo showcases the advanced AI and parallel processing capabilities")
    print("of the todo management system.\n")
    
    try:
        # Run demonstrations
        await demo_ai_enhanced_todo_creation()
        await demo_batch_processing()
        await demo_intelligent_search()
        await demo_ai_recommendations()
        await demo_processing_stats()
        
        print("\n🎉 Demo completed successfully!")
        print("Check the generated database file 'demo_ai_todo.db' to see the created todos.")
        
    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Note: This demo requires the spaCy model to be installed
    print("📝 Note: Make sure to install the spaCy model first:")
    print("   python -m spacy download en_core_web_sm\n")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Demo interrupted by user")
    except Exception as e:
        print(f"\n💥 Demo crashed: {e}")
        import traceback
        traceback.print_exc()
