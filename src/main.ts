import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  //Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  //Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  //Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  //Security
  app.use(helmet());

  //CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN').split(',') || '*',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8080);
}

bootstrap();
