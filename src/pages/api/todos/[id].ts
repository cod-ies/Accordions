import { NextApiRequest, NextApiResponse } from 'next';
import AITodoService, { UpdateTodoInput } from '@/services/aiTodoService';
import { TaskStatus, TaskPriority, TaskCategory } from '@/models/Todo';
import { z } from 'zod';

const updateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  category: z.nativeEnum(TaskCategory).optional(),
  dueDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  tags: z.array(z.string()).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid todo ID' });
  }

  const aiTodoService = new AITodoService();

  try {
    switch (req.method) {
      case 'GET':
        const todo = await aiTodoService.getTodoById(id);
        
        if (!todo) {
          return res.status(404).json({
            success: false,
            error: 'Todo not found',
          });
        }
        
        res.status(200).json({
          success: true,
          data: todo,
        });
        break;

      case 'PUT':
        // Validate request body
        const validatedData = updateTodoSchema.parse(req.body);
        
        // Update todo
        const updatedTodo = await aiTodoService.updateTodo(id, validatedData);
        
        res.status(200).json({
          success: true,
          data: updatedTodo,
          message: 'Todo updated successfully',
        });
        break;

      case 'DELETE':
        const deleted = await aiTodoService.deleteTodo(id);
        
        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: 'Todo not found',
          });
        }
        
        res.status(200).json({
          success: true,
          message: 'Todo deleted successfully',
        });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
        break;
    }
  } catch (error) {
    console.error(`Error handling ${req.method} request for todo ${id}:`, error);
    
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
