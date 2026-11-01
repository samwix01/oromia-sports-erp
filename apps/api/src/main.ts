import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { loadConfig } from './config.js';

async function bootstrap() {
  const cfg = loadConfig();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('Oromia Digital Sports Hub API')
    .setVersion(cfg.version)
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  await app.listen(cfg.port);
}

void bootstrap();
