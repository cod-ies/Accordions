import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { ITodo } from '@/models/Todo';

interface TodoCreatorProps {
  userId: string;
  onTodoCreated: (todo: ITodo) => void;
}

export default function TodoCreator({ userId, onTodoCreated }: TodoCreatorProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchInputs, setBatchInputs] = useState<string[]>(['']);

  const handleSingleCreate = async () => {
    if (!input.trim()) return;

    try {
      setLoading(true);
      const response = await fetch('/api/todos/ai-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawInput: input,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onTodoCreated(data.data);
        setInput('');
      } else {
        alert('Error creating todo: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      alert('Error creating todo');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCreate = async () => {
    const validInputs = batchInputs.filter(input => input.trim());
    if (validInputs.length === 0) return;

    try {
      setLoading(true);
      const response = await fetch('/api/todos/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          todoInputs: validInputs,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add all successful todos
        data.data.results.forEach((todo: ITodo) => onTodoCreated(todo));
        setBatchInputs(['']);
        alert(`Batch created: ${data.data.successful} successful, ${data.data.failed} failed`);
      } else {
        alert('Error creating batch: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      alert('Error creating batch');
    } finally {
      setLoading(false);
    }
  };

  const addBatchInput = () => {
    setBatchInputs([...batchInputs, '']);
  };

  const updateBatchInput = (index: number, value: string) => {
    const newInputs = [...batchInputs];
    newInputs[index] = value;
    setBatchInputs(newInputs);
  };

  const removeBatchInput = (index: number) => {
    if (batchInputs.length > 1) {
      setBatchInputs(batchInputs.filter((_, i) => i !== index));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <SparklesIcon className="h-6 w-6 text-blue-500 mr-2" />
          AI-Powered Todo Creation
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setBatchMode(false)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              !batchMode
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setBatchMode(true)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              batchMode
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Batch
          </button>
        </div>
      </div>

      {!batchMode ? (
        // Single Todo Creation
        <div className="space-y-4">
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your task in natural language... e.g., 'Schedule a meeting with the client tomorrow at 2 PM to discuss project requirements'"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSingleCreate}
            disabled={!input.trim() || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create AI-Enhanced Todo
              </>
            )}
          </button>
        </div>
      ) : (
        // Batch Todo Creation
        <div className="space-y-4">
          <div className="space-y-2">
            {batchInputs.map((input, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => updateBatchInput(index, e.target.value)}
                  placeholder={`Task ${index + 1}...`}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                {batchInputs.length > 1 && (
                  <button
                    onClick={() => removeBatchInput(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={addBatchInput}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 disabled:opacity-50"
              disabled={loading}
            >
              Add Another Task
            </button>
            <button
              onClick={handleBatchCreate}
              disabled={batchInputs.filter(i => i.trim()).length === 0 || loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Create Batch ({batchInputs.filter(i => i.trim()).length})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>
          💡 <strong>Tip:</strong> Use natural language! Try phrases like "Call mom tomorrow", 
          "Urgent: Fix the bug in production", or "Schedule dentist appointment next week"
        </p>
      </div>
    </motion.div>
  );
}
