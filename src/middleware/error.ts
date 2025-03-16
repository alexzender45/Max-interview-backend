import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoError } from 'mongodb';
import { JsonWebTokenError } from 'jsonwebtoken';

interface AppError extends Error {
    statusCode?: number;
    errors?: any[];
    code?: number;
}

const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || undefined;

    if (err instanceof MongooseError.ValidationError) {
        statusCode = 400;
        message = 'Validation Error';
        errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
    } else if (err instanceof MongoError && err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate key error';
        const key = Object.keys((err as any).keyPattern)[0];
        errors = [{ [key]: `This ${key} already exists` }];
    } else if (err instanceof JsonWebTokenError) {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (process.env.NODE_ENV === 'development') {
        console.error(`[${new Date().toISOString()}] Error:`, {
            message: err.message,
            stack: err.stack,
            originalError: err
        });
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
};

const notFound = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`
    });
};

export { errorHandler, notFound };