# AI-Enhanced Todo Management System

A sophisticated todo management application powered by artificial intelligence and parallel processing capabilities.

## 🚀 Features

### AI-Enhanced Task Creation
- **Natural Language Processing**: Parse user input and automatically extract task details (title, description, priority, due date)
- **Smart Categorization**: Automatic tagging and categorization based on content analysis
- **Priority Assignment**: AI-driven priority assignment based on keywords and context
- **Sentiment Analysis**: Understand the emotional context of tasks

### Intelligent Task Storage & Management
- **Advanced Data Structure**: Efficient storage with comprehensive metadata
- **Smart Organization**: Auto-grouping by project, deadline, or category
- **Task Relationships**: Detection and management of dependencies and subtasks
- **AI Metadata**: Rich metadata including confidence scores, extracted entities, and keywords

### Parallel Processing Architecture
- **Batch Processing**: Efficient handling of multiple tasks simultaneously
- **Concurrent Execution**: Optimized parallel processing with configurable workers
- **Error Handling**: Robust error handling for failed operations
- **Result Aggregation**: Intelligent merging of parallel processing results

### Enhanced User Experience
- **Intelligent Search**: AI-powered search with natural language queries
- **Smart Recommendations**: AI-driven task suggestions and prioritization
- **Progress Tracking**: Automated progress monitoring and reporting
- **Completion Predictions**: AI-powered task completion time estimates

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLAlchemy with PostgreSQL/SQLite support
- **AI/ML**: 
  - spaCy for NLP
  - Transformers for sentiment analysis
  - OpenAI API integration (optional)
- **Parallel Processing**: asyncio with ThreadPoolExecutor/ProcessPoolExecutor
- **Testing**: pytest with async support

## 📦 Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd ai-todo-management
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Download spaCy model**:
```bash
python -m spacy download en_core_web_sm
```

5. **Set up environment variables** (optional):
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🚀 Quick Start

1. **Initialize the database**:
```bash
python database.py
```

2. **Run the application**:
```bash
python main.py
```

3. **Access the API**:
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## 📖 API Usage Examples

### Create AI-Enhanced Todo
```bash
curl -X POST "http://localhost:8000/todos/ai-create" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_input": "Schedule a meeting with the client tomorrow at 2 PM to discuss project requirements",
    "user_id": "user123"
  }'
```

### Batch Create Todos
```bash
curl -X POST "http://localhost:8000/todos/batch-create" \
  -H "Content-Type: application/json" \
  -d '{
    "todo_inputs": [
      "Buy groceries for the week",
      "Call mom to check on her health",
      "Finish the quarterly report by Friday"
    ],
    "user_id": "user123"
  }'
```

### Intelligent Search
```bash
curl -X GET "http://localhost:8000/todos/search?query=project%20work&user_id=user123"
```

### Get AI Recommendations
```bash
curl -X GET "http://localhost:8000/todos/recommendations?user_id=user123&limit=5"
```

## 🧪 Testing

Run the test suite:
```bash
pytest tests/ -v
```

Run specific test categories:
```bash
# Test AI service
pytest tests/test_ai_todo_service.py -v

# Test parallel processing
pytest tests/test_parallel_processor.py -v

# Test NLP functionality
pytest tests/test_nlp_processor.py -v
```

## ⚙️ Configuration

Key configuration options in `config.py`:

```python
# Parallel Processing
max_workers: int = 4
batch_size: int = 20
max_concurrent_batches: int = 3

# AI Configuration
openai_api_key: Optional[str] = None
use_local_models: bool = True

# Database
database_url: str = "sqlite:///./ai_todo_management.db"
```

## 🏗️ Architecture

### Core Components

1. **Models** (`models/todo.py`):
   - Todo data structures with AI metadata
   - Task relationships and dependencies
   - Pydantic models for API validation

2. **AI Processor** (`ai/nlp_processor.py`):
   - Natural language parsing
   - Entity extraction and sentiment analysis
   - Smart categorization and tagging

3. **Parallel Processor** (`core/parallel_processor.py`):
   - Batch creation and management
   - Concurrent task processing
   - Error handling and result aggregation

4. **AI Service** (`services/ai_todo_service.py`):
   - Integration of AI and parallel processing
   - Business logic and recommendations
   - Database operations

### Processing Flow

```
User Input → NLP Processing → AI Enhancement → Parallel Processing → Database Storage
     ↓
Natural Language → Parsed Task Info → AI Metadata → Batch Processing → Todo Response
```

## 🔧 Advanced Features

### Custom AI Models
Integrate your own AI models by extending the `NLPProcessor` class:

```python
class CustomNLPProcessor(NLPProcessor):
    def __init__(self, custom_model_path: str):
        super().__init__()
        self.custom_model = load_model(custom_model_path)
    
    async def custom_analysis(self, text: str):
        # Your custom AI logic here
        pass
```

### Parallel Processing Optimization
Tune parallel processing parameters based on your workload:

```python
processor = ParallelProcessor(
    max_workers=8,           # Increase for CPU-intensive tasks
    batch_size=50,           # Larger batches for I/O operations
    max_concurrent_batches=5, # Balance memory vs. speed
    use_process_pool=True    # For CPU-bound operations
)
```

## 📊 Performance Monitoring

Monitor system performance through the stats endpoint:
```bash
curl -X GET "http://localhost:8000/stats"
```

Returns processing statistics including:
- Total processed items
- Average batch processing time
- Error rates
- Worker utilization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the test files for usage examples

## 🔮 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced ML models for better predictions
- [ ] Integration with external calendar systems
- [ ] Mobile app support
- [ ] Voice input processing
- [ ] Advanced analytics and reporting
