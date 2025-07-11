import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService, { SearchFilters } from '@/services/aiTodoService';
import { TaskStatus, TaskPriority, TaskCategory } from '@/models/Todo';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  category: z.nativeEnum(TaskCategory).optional(),
  projectId: z.string().optional(),
  minPriorityScore: z.number().min(0).max(1).optional(),
  isOverdue: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse and validate query parameters
    const queryParams = {
      ...req.query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      minPriorityScore: req.query.minPriorityScore ? parseFloat(req.query.minPriorityScore as string) : undefined,
      isOverdue: req.query.isOverdue === 'true',
    };

    const validatedData = searchSchema.parse(queryParams);
    
    // Build filters
    const filters: SearchFilters = {};
    if (validatedData.status) filters.status = validatedData.status;
    if (validatedData.priority) filters.priority = validatedData.priority;
    if (validatedData.category) filters.category = validatedData.category;
    if (validatedData.projectId) filters.projectId = validatedData.projectId;
    if (validatedData.minPriorityScore !== undefined) filters.minPriorityScore = validatedData.minPriorityScore;
    if (validatedData.isOverdue) filters.isOverdue = validatedData.isOverdue;
    
    // Create AI service instance
    const aiTodoService = new AITodoService();
    
    // Perform intelligent search
    const todos = await aiTodoService.intelligentSearch(
      validatedData.query,
      validatedData.userId,
      filters,
      validatedData.limit
    );
    
    res.status(200).json({
      success: true,
      data: todos,
      count: todos.length,
      message: `Found ${todos.length} matching todos`,
    });
  } catch (error) {
    console.error('Error in intelligent search:', error);
    
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
