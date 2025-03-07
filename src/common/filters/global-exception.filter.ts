import { ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger, } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter to handle all unhandled exceptions in NestJS application
 * 
 * This filter replaces the Express error handling middleware with a more structured
 * NestJS approach that can handle both HTTP and unknown exceptions.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    /**
   * Catches and processes all exceptions thrown in the application
   * 
   * @param exception - The caught exception
   * @param host - Arguments host containing the execution context
   */
    catch (exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
    
        // Determine status code and error message based on exception type
        let statusCode: number;
        let message: string;
        let error: string;
    
        if (exception instanceof HttpException) {
            // Handle HTTP exceptions (thrown by NestJS)
            statusCode = exception.getStatus();
            const errorResponse = exception.getResponse();
      
            // Extract message and error from the exception response
            if (typeof errorResponse === 'object' && errorResponse !== null) {
                message = (errorResponse as any).message || exception.message;
                error = (errorResponse as any).error || 'Http Exception';
            } else {
                message = exception.message;
                error = 'Http Exception';
            }
        } else {
            // Handle unknown exceptions
            statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Unknown Error';
      
            // Log unknown exceptions with stack trace
            if (exception instanceof Error) {
                message = exception.message;
                this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
            } else {
                this.logger.error('Unhandled exception', exception);
            }
        }
    
        // Format and send the error response
        const responseBody = {
            statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            error,
            message,
        };
    
        // Log all exceptions at appropriate level
        if (statusCode >= 500) {
            this.logger.error(`${request.method} ${request.url} ${statusCode}`, responseBody);
        } else if (statusCode >= 400) {
            this.logger.warn(`${request.method} ${request.url} ${statusCode}`, responseBody);
        } else {
            this.logger.log(`${request.method} ${request.url} ${statusCode}`, responseBody);
        }
    
        response.status(statusCode).json(responseBody);
    }
}