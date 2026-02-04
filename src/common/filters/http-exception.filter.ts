import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    // Log the exception for debugging (includes stack for unexpected errors)
    try {
      if (exception instanceof Error) {
        // Prefer structured error logging in prod; console for local debugging
        console.error(
          'Unhandled exception:',
          exception.stack || exception.message,
        );
      } else {
        console.error('Unhandled exception (non-error):', exception);
      }
    } catch (logErr) {
      // ignore logging failures
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).send({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
