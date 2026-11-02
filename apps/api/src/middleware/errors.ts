import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ApiError } from '../lib/http.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`No API route for ${req.method} ${req.path}`));
}

// Centralised error handler: maps known errors to safe, consistent JSON responses.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof multer.MulterError) {
    apiError = ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5 MB).' : err.message);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') apiError = ApiError.conflict('A record with that value already exists.', { fields: err.meta?.target });
    else if (err.code === 'P2025') apiError = ApiError.notFound('The requested record was not found.');
    else if (err.code === 'P2003') apiError = ApiError.conflict('This record is still referenced by other data.');
    else apiError = new ApiError(500, 'DATABASE_ERROR', 'A database error occurred. Please try again.');
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    apiError = new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is currently unavailable. Please try again shortly.');
  } else if (err instanceof SyntaxError && 'body' in (err as object)) {
    apiError = ApiError.badRequest('Malformed JSON body.');
  } else if ((err as { type?: string })?.type === 'entity.too.large') {
    apiError = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  } else {
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
  }

  if (apiError.status >= 500) logger.error({ err, path: req.path, method: req.method }, 'Request failed');

  res.status(apiError.status).json({
    error: { code: apiError.code, message: apiError.message, ...(apiError.details ? { details: apiError.details } : {}) },
  });
}
