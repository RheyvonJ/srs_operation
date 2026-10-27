import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1');
}
await bootstrap();
