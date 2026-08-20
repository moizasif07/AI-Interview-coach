import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // Ensure sqlite data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // --- Sentry ---
  const sentryDsn = config.get<string>('sentry.dsn');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.get<string>('nodeEnv'),
      tracesSampleRate: 1.0,
    });
  }

  // --- Global validation ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // --- Global error handling + logging ---
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // --- CORS (frontend runs on a different origin/port) ---
  app.enableCors({ origin: true, credentials: true });

  // --- Swagger ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Interview Coach API')
    .setDescription(
      'REST API for the AI Interview Coach application: role-based AI-generated interview questions, ' +
        'answer submission, AI-powered analysis/scoring, and emailed professional reports.',
    )
    .setVersion('1.0')
    .addTag('Interviews')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 AI Interview Coach API running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
