import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(process.env.PORT ?? 3002);
  await app.listen({ port, host: '0.0.0.0' });
  process.stdout.write(`ai-gateway listening on ${port}\n`);
}

void bootstrap();
