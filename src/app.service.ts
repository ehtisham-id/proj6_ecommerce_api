import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string } {
    return { status: 'OK' };
  }

  getHello(): string {
    return 'Welcome to the E-commerce API!';
  }
}
