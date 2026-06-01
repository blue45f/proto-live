import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noimageindex');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // 글로벌 ValidationPipe 설정 - DTO 기반 입력 검증 활성화
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 프로퍼티 자동 제거
      forbidNonWhitelisted: true, // 계약 밖의 필드는 명시적으로 차단
      transform: true, // 요청 페이로드를 DTO 인스턴스로 자동 변환
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ].join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // CORS 설정 - Vite React 프론트엔드에서 NestJS 백엔드로의 요청을 허용
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3003);
  await app.listen(port);
  console.log(`\n===============================================================`);
  console.log(`  🚀 ProtoLive NestJS Backend running on: http://localhost:${port}`);
  console.log(`  🟢 URL verification and Project APIs are active!`);
  console.log(`===============================================================\n`);
}
bootstrap();
