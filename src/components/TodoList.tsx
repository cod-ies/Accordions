import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  TrashIcon,
  PencilIcon,
  TagIcon,
  CalendarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ITodo, TaskStatus, TaskPriority } from '@/models/Todo';
import { format } from 'date-fns';

interface TodoListProps {
  todos: ITodo[];
  loading: boolean;
  onTodoUpdated: (todo: ITodo) => void;
  onTodoDeleted: (todoId: string) => void;
}

export default function TodoList({ todos, loading, onTodoUpdated, onTodoDeleted }: TodoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TaskPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TaskPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case TaskStatus.IN_PROGRESS:
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case TaskStatus.ON_HOLD:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const handleStatusChange = async (todo: ITodo, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/todos/${todo._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        onTodoUpdated(data.data);
      }
    } catch (error) {
      console.error('Error updating todo status:', error);
    }
  };

  const handleDelete = async (todoId: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        onTodoDeleted(todoId);
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleEditStart = (todo: ITodo) => {
    setEditingId(todo._id.toString());
    setEditTitle(todo.title);
  };

  const handleEditSave = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editTitle }),
      });

      const data = await response.json();
      if (data.success) {
        onTodoUpdated(data.data);
        setEditingId(null);
        setEditTitle('');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
        <p className="text-gray-500">
          Create your first AI-enhanced todo using natural language above!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Your Todos ({todos.length})
      </h2>
      
      <div className="space-y-3">
        <AnimatePresence>
          {todos.map((todo) => (
            <motion.div
              key={todo._id.toString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                todo.status === TaskStatus.COMPLETED
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white border-gray-300 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Status Icon */}
                <button
                  onClick={() => {
                    const newStatus = todo.status === TaskStatus.COMPLETED 
                      ? TaskStatus.PENDING 
                      : TaskStatus.COMPLETED;
                    handleStatusChange(todo, newStatus);
                  }}
                  className="mt-1 hover:scale-110 transition-transform"
                >
                  {getStatusIcon(todo.status)}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-center justify-between">
                    {editingId === todo._id.toString() ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 p-1 border border-gray-300 rounded"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleEditSave(todo._id.toString());
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditSave(todo._id.toString())}
                          className="text-green-600 hover:text-green-800"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <h3
                        className={`text-lg font-medium ${
                          todo.status === TaskStatus.COMPLETED
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {todo.title}
                      </h3>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditStart(todo)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(todo._id.toString())}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {todo.description && (
                    <p className="text-gray-600 mt-1 text-sm">{todo.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 mt-3 text-sm">
                    {/* Priority */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                        todo.priority
                      )}`}
                    >
                      {todo.priority}
                    </span>

                    {/* AI Score */}
                    {todo.autoGenerated && (
                      <div className="flex items-center text-blue-600">
                        <SparklesIcon className="h-4 w-4 mr-1" />
                        <span>AI: {(todo.aiPriorityScore * 100).toFixed(0)}%</span>
                      </div>
                    )}

                    {/* Due Date */}
                    {todo.dueDate && (
                      <div className="flex items-center text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>
                          {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {/* Category */}
                    {todo.category && (
                      <span className="text-gray-500 capitalize">{todo.category}</span>
                    )}
                  </div>

                  {/* Tags */}
                  {todo.tags && todo.tags.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      <TagIcon className="h-4 w-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {todo.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  {todo.progressPercentage > 0 && todo.progressPercentage < 100 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{todo.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${todo.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
