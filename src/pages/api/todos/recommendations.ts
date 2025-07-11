import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService from '@/services/aiTodoService';
import { z } from 'zod';

const recommendationsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().min(1).max(50).default(10),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse and validate query parameters
    const queryParams = {
      userId: req.query.userId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const validatedData = recommendationsSchema.parse(queryParams);
    
    // Create AI service instance
    const aiTodoService = new AITodoService();
    
    // Get AI recommendations
    const recommendations = await aiTodoService.getAIRecommendations(
      validatedData.userId,
      validatedData.limit
    );
    
    res.status(200).json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      message: `Generated ${recommendations.length} AI recommendations`,
    });
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
