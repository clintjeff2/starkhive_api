import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('StarkHive API')
    .setDescription('API documentation for StarkHive')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`StarkHive app listening on http://localhost:${port}/api/v1`);
  console.log(
    `StarkHive Swagger docs available at http://localhost:${port}/api/docs`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
