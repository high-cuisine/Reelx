import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AdminModule } from './admin/admin.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const adminApp = await NestFactory.create(AdminModule)
  app.setGlobalPrefix('api');
  
  adminApp.setGlobalPrefix('api/admin-c7ad44cbad762a5da0a4');

  const corsOrigins = process.env.CORS_ORIGIN
    ? [
        'http://89.124.66.87',
        'http://89.124.66.87:5173',
        ...process.env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      ]
    : true;

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // Глобальная валидация DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  adminApp.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-session-id'],
  });

  adminApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  
  await app.listen(process.env.PORT ?? 3000);
  await adminApp.listen(process.env.ADMIN_PORT ?? 3001);
}
bootstrap();
