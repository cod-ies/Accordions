import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService from '@/services/aiTodoService';
import { z } from 'zod';

const batchCreateSchema = z.object({
  todoInputs: z.array(z.string().min(1).max(1000)).min(1).max(100),
  userId: z.string().min(1),
  projectId: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validatedData = batchCreateSchema.parse(req.body);
    
    // Create AI service instance
    const aiTodoService = new AITodoService();
    
    // Batch create todos
    const result = await aiTodoService.batchCreateTodos(
      validatedData.todoInputs,
      validatedData.userId,
      validatedData.projectId
    );
    
    res.status(201).json({
      success: true,
      data: result,
      message: `Batch processing completed: ${result.successful} successful, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('Error in batch todo creation:', error);
    
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
