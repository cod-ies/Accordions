import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService, { SearchFilters } from '@/services/aiTodoService';
import { TaskStatus, TaskPriority, TaskCategory } from '@/models/Todo';
import { z } from 'zod';

const listTodosSchema = z.object({
  userId: z.string().min(1),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  category: z.nativeEnum(TaskCategory).optional(),
  projectId: z.string().optional(),
  page: z.number().min(1).default(1),
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
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const validatedData = listTodosSchema.parse(queryParams);
    
    // Build filters
    const filters: SearchFilters = {};
    if (validatedData.status) filters.status = validatedData.status;
    if (validatedData.priority) filters.priority = validatedData.priority;
    if (validatedData.category) filters.category = validatedData.category;
    if (validatedData.projectId) filters.projectId = validatedData.projectId;
    
    // Create AI service instance
    const aiTodoService = new AITodoService();
    
    // Get user todos with pagination
    const result = await aiTodoService.getUserTodos(
      validatedData.userId,
      filters,
      validatedData.page,
      validatedData.limit
    );
    
    res.status(200).json({
      success: true,
      data: result.todos,
      pagination: {
        page: result.page,
        limit: validatedData.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      message: `Retrieved ${result.todos.length} todos`,
    });
  } catch (error) {
    console.error('Error listing todos:', error);
    
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
