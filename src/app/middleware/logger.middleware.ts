import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * LoggerMiddleware - Custom NestJS middleware for logging HTTP requests
 * 
 * This middleware replaces the Express Morgan logger with a custom implementation
 * that follows NestJS patterns and practices.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  /**
   * Middleware function that logs request information
   * 
   * @param req - Express Request object
   * @param res - Express Response object
   * @param next - Next function to continue the middleware chain
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    
    // Log information when the response is finished
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Determine log level based on status code
      let logLevel = 'INFO';
      if (statusCode >= 400 && statusCode < 500) {
        logLevel = 'WARN';
      } else if (statusCode >= 500) {
        logLevel = 'ERROR';
      }
      
      // Format the log message
      const message = `[${logLevel}] ${method} ${originalUrl} ${statusCode} - ${responseTime}ms - ${ip}`;
      
      // Log using the appropriate console method
      if (logLevel === 'ERROR') {
        console.error(message);
      } else if (logLevel === 'WARN') {
        console.warn(message);
      } else {
        console.log(message);
      }
    });
    
    // Continue to the next middleware or route handler
    next();
  }
}