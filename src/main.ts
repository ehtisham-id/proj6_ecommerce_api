import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';

import helmet from '@fastify/helmet';
import path from 'path';
//import fastifyStatic from '@fastify/static';

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: true });

  // Serve the static UI from the backend so the frontend and API share origin.
  // This avoids CORS/CSP cross-origin issues during local development.
  // await (adapter.getInstance() as any).register(fastifyStatic, {
  //   root: path.join(__dirname, '..', 'ui'),
  //   prefix: '/',
  //   wildcard: true,
  // });

  await (adapter.getInstance() as any).register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // Use a single global prefix and rely on versioning to add the `/v1` segment.
  // Setting the prefix to just `api` prevents routes ending up as `/api/v1/v1/...`.
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Allow the configured FRONTEND_URL plus common local dev origins so
  // the static UI (served by Live Server on port 5500) can POST to the API.
  const configuredFrontend = configService.get('FRONTEND_URL');
  const allowedOrigins = [
    configuredFrontend,
    'http://127.0.0.1:5500',
    'http://localhost:5500',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  const port = Number(configService.get('PORT')) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 App running at ${await app.getUrl()}/api/v1`);
}

void bootstrap();
