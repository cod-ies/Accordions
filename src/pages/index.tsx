import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import TodoCreator from '@/components/TodoCreator';
import TodoList from '@/components/TodoList';
import RecommendationPanel from '@/components/RecommendationPanel';
import SearchBar from '@/components/SearchBar';
import StatsPanel from '@/components/StatsPanel';
import { ITodo } from '@/models/Todo';
import { RecommendationItem } from '@/services/aiTodoService';

export default function Home() {
  const [todos, setTodos] = useState<ITodo[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId] = useState('demo_user'); // In a real app, this would come from authentication

  // Fetch todos
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/todos?userId=${userId}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setTodos(data.data);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`/api/todos/recommendations?userId=${userId}&limit=5`);
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  // Search todos
  const searchTodos = async (query: string) => {
    if (!query.trim()) {
      fetchTodos();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/todos/search?query=${encodeURIComponent(query)}&userId=${userId}&limit=50`
      );
      const data = await response.json();
      
      if (data.success) {
        setTodos(data.data);
      }
    } catch (error) {
      console.error('Error searching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle todo creation
  const handleTodoCreated = (newTodo: ITodo) => {
    setTodos(prev => [newTodo, ...prev]);
    fetchRecommendations(); // Refresh recommendations
  };

  // Handle todo update
  const handleTodoUpdated = (updatedTodo: ITodo) => {
    setTodos(prev => prev.map(todo => 
      todo._id === updatedTodo._id ? updatedTodo : todo
    ));
    fetchRecommendations(); // Refresh recommendations
  };

  // Handle todo deletion
  const handleTodoDeleted = (todoId: string) => {
    setTodos(prev => prev.filter(todo => todo._id.toString() !== todoId));
    fetchRecommendations(); // Refresh recommendations
  };

  useEffect(() => {
    fetchTodos();
    fetchRecommendations();
  }, []);

  return (
    <>
      <Head>
        <title>AI-Enhanced Todo Management</title>
        <meta name="description" content="Intelligent todo management with AI-powered features" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🤖 AI-Enhanced Todo Management
            </h1>
            <p className="text-lg text-gray-600">
              Intelligent task management with AI-powered features and parallel processing
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Todo Creation and Search */}
            <div className="lg:col-span-2 space-y-6">
              {/* Todo Creator */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <TodoCreator userId={userId} onTodoCreated={handleTodoCreated} />
              </motion.div>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={searchTodos}
                  placeholder="Search todos with natural language..."
                />
              </motion.div>

              {/* Todo List */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <TodoList
                  todos={todos}
                  loading={loading}
                  onTodoUpdated={handleTodoUpdated}
                  onTodoDeleted={handleTodoDeleted}
                />
              </motion.div>
            </div>

            {/* Right Column - Recommendations and Stats */}
            <div className="space-y-6">
              {/* Recommendations */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <RecommendationPanel
                  recommendations={recommendations}
                  onRefresh={fetchRecommendations}
                />
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <StatsPanel />
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center text-gray-500"
          >
            <p>
              Built with Next.js, MongoDB, and AI-powered natural language processing
            </p>
          </motion.footer>
        </div>
      </div>
    </>
  );
}
