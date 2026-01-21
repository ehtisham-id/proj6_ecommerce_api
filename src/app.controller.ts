import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {

  @Get()
  getRoot() {
    return { message: 'Welcome to the API' };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
