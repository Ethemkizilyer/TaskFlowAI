import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types';
import customFieldService from '../services/customFieldService';

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  position: z.number().int().default(0),
});

const updateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX']).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  position: z.number().int().optional(),
});

const setValueSchema = z.object({
  value: z.string().nullable(),
});

export const createCustomField = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    const data = createSchema.parse(req.body);
    const field = await customFieldService.create(boardId, data);
    return res.status(201).json({ success: true, data: field, message: 'Custom field created' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const getCustomFields = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    const fields = await customFieldService.getByBoard(boardId);
    return res.json({ success: true, data: fields });
  } catch (error) {
    next(error);
  }
};

export const updateCustomField = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const data = updateSchema.parse(req.body);
    const field = await customFieldService.update(fieldId, data);
    return res.json({ success: true, data: field });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const deleteCustomField = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    await customFieldService.delete(fieldId);
    return res.json({ success: true, message: 'Custom field deleted' });
  } catch (error) {
    next(error);
  }
};

export const getTaskValues = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const values = await customFieldService.getTaskValues(taskId);
    return res.json({ success: true, data: values });
  } catch (error) {
    next(error);
  }
};

export const setTaskValue = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { fieldId, taskId } = req.params;
    const { value } = setValueSchema.parse(req.body);
    const val = await customFieldService.setTaskValue(fieldId, taskId, value);
    return res.json({ success: true, data: val });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};
