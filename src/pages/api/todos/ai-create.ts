import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService from '@/services/aiTodoService';
import { z } from 'zod';

const createTodoSchema = z.object({
  rawInput: z.string().min(1).max(1000),
  userId: z.string().min(1),
  projectId: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validatedData = createTodoSchema.parse(req.body);
    
    // Create AI service instance
    const aiTodoService = new AITodoService();
    
    // Create AI-enhanced todo
    const todo = await aiTodoService.createAIEnhancedTodo(validatedData);
    
    res.status(201).json({
      success: true,
      data: todo,
      message: 'AI-enhanced todo created successfully',
    });
  } catch (error) {
    console.error('Error in AI todo creation:', error);
    
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
