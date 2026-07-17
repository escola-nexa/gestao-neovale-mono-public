import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Habilita CORS para o frontend local e de produção
  app.enableCors({
    origin: '*',
  });
  await app.listen(3000);
}
bootstrap();
