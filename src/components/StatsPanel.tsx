import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  CpuChipIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ProcessingStats {
  totalProcessed: number;
  totalBatches: number;
  averageBatchTime: number;
  errorRate: number;
  throughputPerSecond: number;
}

interface StatsData {
  parallelProcessorStats: ProcessingStats;
  serviceInfo: {
    maxWorkers: number;
    batchSize: number;
    maxConcurrentBatches: number;
    timeoutMs: number;
  };
  timestamp: string;
}

export default function StatsPanel() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-500 mr-2" />
          Processing Stats
        </h2>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh stats"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!stats ? (
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-50 rounded-lg p-4 border border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Processed</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNumber(stats.parallelProcessorStats.totalProcessed)}
                  </p>
                </div>
                <CpuChipIcon className="h-8 w-8 text-blue-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-green-50 rounded-lg p-4 border border-green-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Batches</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatNumber(stats.parallelProcessorStats.totalBatches)}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-green-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Avg Batch Time</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {formatTime(stats.parallelProcessorStats.averageBatchTime)}
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-red-50 rounded-lg p-4 border border-red-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Error Rate</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatPercentage(stats.parallelProcessorStats.errorRate)}
                  </p>
                </div>
                <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
              </div>
            </motion.div>
          </div>

          {/* Throughput */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-purple-50 rounded-lg p-4 border border-purple-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Throughput</p>
                <p className="text-xl font-bold text-purple-900">
                  {stats.parallelProcessorStats.throughputPerSecond.toFixed(1)} items/sec
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-600">Peak Performance</p>
                <div className="w-24 bg-purple-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (stats.parallelProcessorStats.throughputPerSecond / 10) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <h3 className="text-sm font-medium text-gray-700 mb-3">Configuration</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Max Workers:</span>
                <span className="ml-2 font-medium">{stats.serviceInfo.maxWorkers}</span>
              </div>
              <div>
                <span className="text-gray-500">Batch Size:</span>
                <span className="ml-2 font-medium">{stats.serviceInfo.batchSize}</span>
              </div>
              <div>
                <span className="text-gray-500">Max Concurrent:</span>
                <span className="ml-2 font-medium">{stats.serviceInfo.maxConcurrentBatches}</span>
              </div>
              <div>
                <span className="text-gray-500">Timeout:</span>
                <span className="ml-2 font-medium">{formatTime(stats.serviceInfo.timeoutMs)}</span>
              </div>
            </div>
          </motion.div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-center">
            Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
