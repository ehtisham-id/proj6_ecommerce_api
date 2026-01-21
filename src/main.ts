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

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: true });

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

  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
  });

  const port = Number(configService.get('PORT')) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 App running at ${await app.getUrl()}/api/v1`);
}

void bootstrap();
