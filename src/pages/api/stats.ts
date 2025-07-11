import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService from '@/services/aiTodoService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const aiTodoService = new AITodoService();
    const stats = aiTodoService.getProcessingStats();
    
    res.status(200).json({
      success: true,
      data: {
        parallelProcessorStats: stats,
        serviceInfo: {
          maxWorkers: 4,
          batchSize: 20,
          maxConcurrentBatches: 3,
          timeoutMs: 30000,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
