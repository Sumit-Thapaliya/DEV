import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/AppError.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: err.issues[0]?.message ?? 'Validation failed',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ success: false, message: err.message });
    return;
  }

  if (err?.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ success: false, message: 'Invalid JSON in request body' });
    return;
  }

  const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const message =
    status === 500 ? 'Internal server error' : err?.message ?? 'Internal server error';

  if (status === 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ success: false, message });
};
