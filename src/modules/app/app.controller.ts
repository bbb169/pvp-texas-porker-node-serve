import { Controller, Get, Render } from '@nestjs/common';

/**
 * Application root controller
 * 
 * This controller handles the main application routes
 * including the index route for the home page
 */
@Controller()
export class AppController {
    constructor () {}

  /**
   * Root route handler
   * 
   * @returns Simple response message
   */
  @Get()
    getHello (): { message: string } {
        return { message: 'Welcome to Texas Poker Server!' };
    }

  /**
   * Route for rendering the index page
   * 
   * @returns Object containing data for rendering the index template
   */
  @Get('index')
  @Render('index')
  getIndex (): { title: string } {
      return { title: 'Texas Poker Game' };
  }

  /**
   * Health check endpoint
   * 
   * @returns Simple OK response to check if service is running
   */
  @Get('health')
  getHealth (): { status: string } {
      return { status: 'OK' };
  }
}