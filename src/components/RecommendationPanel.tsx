import { motion } from 'framer-motion';
import { 
  LightBulbIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  ArrowPathIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { RecommendationItem } from '@/services/aiTodoService';

interface RecommendationPanelProps {
  recommendations: RecommendationItem[];
  onRefresh: () => void;
}

export default function RecommendationPanel({ recommendations, onRefresh }: RecommendationPanelProps) {
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'overdue_tasks':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'high_priority':
        return <BoltIcon className="h-5 w-5 text-orange-500" />;
      case 'due_soon':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'quick_wins':
        return <LightBulbIcon className="h-5 w-5 text-green-500" />;
      case 'stalled_tasks':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <LightBulbIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <LightBulbIcon className="h-6 w-6 text-yellow-500 mr-2" />
          AI Recommendations
        </h2>
        <button
          onClick={onRefresh}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh recommendations"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <LightBulbIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recommendations available</p>
          <p className="text-sm text-gray-400 mt-1">
            Create some todos to get AI-powered insights!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <motion.div
              key={`${recommendation.type}-${index}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border-l-4 rounded-lg p-4 ${getPriorityColor(recommendation.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getRecommendationIcon(recommendation.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {recommendation.message}
                  </h3>
                  
                  {recommendation.actionSuggestion && (
                    <p className="text-xs text-gray-600 mb-3">
                      💡 {recommendation.actionSuggestion}
                    </p>
                  )}
                  
                  {recommendation.todos.length > 0 && (
                    <div className="space-y-2">
                      {recommendation.todos.slice(0, 3).map((todo) => (
                        <div
                          key={todo._id.toString()}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <ChevronRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 truncate">
                            {todo.title}
                          </span>
                          {todo.dueDate && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                      
                      {recommendation.todos.length > 3 && (
                        <p className="text-xs text-gray-500 ml-5">
                          +{recommendation.todos.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
