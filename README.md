# 🤖 AI-Enhanced Todo Management System

A sophisticated todo management application built with **Next.js** and **MongoDB**, powered by artificial intelligence and parallel processing capabilities.

## 🚀 Features

### AI-Enhanced Task Creation
- **Natural Language Processing**: Parse user input and automatically extract task details (title, description, priority, due date)
- **Smart Categorization**: AI-powered categorization and tagging based on content analysis
- **Priority Assignment**: Intelligent priority scoring using keywords and context analysis
- **Sentiment Analysis**: Understand the emotional context of tasks

### Parallel Processing Architecture
- **Batch Processing**: Efficient handling of multiple tasks simultaneously
- **Configurable Concurrency**: Adjustable workers and batch sizes for optimal performance
- **Error Handling**: Robust error management with detailed reporting
- **Result Aggregation**: Intelligent merging of parallel processing results

### Intelligent Features
- **Smart Search**: AI-powered search with natural language queries
- **Recommendations**: AI-driven task suggestions and prioritization
- **Progress Tracking**: Automated monitoring and analytics
- **Duration Estimation**: AI-powered task completion time estimates

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with React 18
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **AI/ML**:
  - Natural.js for NLP processing
  - Compromise.js for text analysis
  - Sentiment analysis
  - OpenAI API integration (optional)
- **Styling**: Tailwind CSS with Headless UI
- **Animations**: Framer Motion
- **Type Safety**: TypeScript throughout

## 📦 Installation

1. **Clone the repository**:
```bash
git clone https://github.com/cod-ies/Accordions.git
cd Accordions
```

2. **Install dependencies**:
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Set up MongoDB**:
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in `.env.local`

## 🚀 Quick Start

1. **Start the development server**:
```bash
npm run dev
# or
yarn dev
```

2. **Open your browser**:
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Start creating AI-enhanced todos!

3. **API Documentation**:
   - Health check: `GET /api/health`
   - Processing stats: `GET /api/stats`

## 📖 API Usage Examples

### Create AI-Enhanced Todo
```bash
curl -X POST "http://localhost:3000/api/todos/ai-create" \
  -H "Content-Type: application/json" \
  -d '{
    "rawInput": "Schedule a meeting with the client tomorrow at 2 PM to discuss project requirements",
    "userId": "user123"
  }'
```

### Batch Create Todos
```bash
curl -X POST "http://localhost:3000/api/todos/batch-create" \
  -H "Content-Type: application/json" \
  -d '{
    "todoInputs": [
      "Buy groceries for the week",
      "Call mom to check on her health",
      "Finish the quarterly report by Friday"
    ],
    "userId": "user123"
  }'
```

### Intelligent Search
```bash
curl -X GET "http://localhost:3000/api/todos/search?query=project%20work&userId=user123"
```

### Get AI Recommendations
```bash
curl -X GET "http://localhost:3000/api/todos/recommendations?userId=user123&limit=5"
```

## 🧪 Testing

Run the test suite:
```bash
npm test
# or
yarn test
```

Run tests in watch mode:
```bash
npm run test:watch
# or
yarn test:watch
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── TodoCreator.tsx  # AI-powered todo creation
│   ├── TodoList.tsx     # Todo display and management
│   ├── SearchBar.tsx    # Intelligent search interface
│   ├── RecommendationPanel.tsx  # AI recommendations
│   └── StatsPanel.tsx   # Processing statistics
├── lib/
│   └── mongodb.ts       # Database connection
├── models/
│   └── Todo.ts          # MongoDB schema and types
├── pages/
│   ├── api/             # API routes
│   │   ├── todos/       # Todo-related endpoints
│   │   ├── health.ts    # Health check
│   │   └── stats.ts     # Processing statistics
│   └── index.tsx        # Main application page
└── services/
    ├── aiTodoService.ts     # Main AI service
    ├── nlpService.ts        # Natural language processing
    └── parallelProcessor.ts # Parallel processing engine
```

## ⚙️ Configuration

Key configuration options:

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `OPENAI_API_KEY`: OpenAI API key (optional)
- `NEXTAUTH_SECRET`: NextAuth secret for sessions
- `NODE_ENV`: Environment (development/production)

### Parallel Processing
- **Max Workers**: 4 (configurable)
- **Batch Size**: 20 (configurable)
- **Max Concurrent Batches**: 3 (configurable)
- **Timeout**: 30 seconds (configurable)

## 🔧 Advanced Features

### Custom AI Models
The system supports both local NLP processing and OpenAI integration:

```typescript
// Local processing (default)
const nlpService = new NLPService();

// With OpenAI enhancement
const nlpService = new NLPService();
// Set OPENAI_API_KEY in environment
```

### Parallel Processing Optimization
Tune parallel processing parameters based on your workload:

```typescript
const processor = new ParallelProcessor({
  maxWorkers: 8,           // Increase for CPU-intensive tasks
  batchSize: 50,           // Larger batches for I/O operations
  maxConcurrentBatches: 5, // Balance memory vs. speed
  timeoutMs: 60000         // Adjust timeout as needed
});
```

## 📊 Performance Monitoring

Monitor system performance through the stats endpoint:
```bash
curl -X GET "http://localhost:3000/api/stats"
```

Returns processing statistics including:
- Total processed items
- Average batch processing time
- Error rates
- Throughput metrics
- Worker utilization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api/health`
- Review the component files for usage examples

## 🔮 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced ML models for better predictions
- [ ] Integration with external calendar systems
- [ ] Mobile app support
- [ ] Voice input processing
- [ ] Advanced analytics and reporting
- [ ] Team management features
- [ ] Integration with project management tools

---

**Built with ❤️ using Next.js, MongoDB, and AI-powered natural language processing**


