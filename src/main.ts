import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupLogging } from '@common/logging';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import helmet from 'fastify-helmet';
import fastifySecureSession from 'fastify-secure-session';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // app.useGlobalInterceptors(
  //   new CacheInterceptor(reflector, cacheService),
  //   new PerformanceInterceptor(),
  //   new CompressionInterceptor(),
  // );

  // // Global cache invalidation pipe
  // app.useGlobalPipes(new CacheInvalidationPipe());

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Fastify plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `'unsafe-inline'`],
      },
    },
  });

  // CORS
  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
  });

  // Rate limiting configured in AppModule
  await app.listen(configService.get('PORT') || 3000, '0.0.0.0');
  console.log(`🚀 Application is running on: ${await app.getUrl()}/api/v1`);
}

void bootstrap();
