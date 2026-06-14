import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { isCorsOriginAllowed } from './common/cors-policy'
import { ZodValidationPipe } from './common/zod-validation.pipe'
import { validateEnv } from './config/env'

import type { NextFunction, Request, Response } from 'express'

async function bootstrap() {
  // 환경변수 검증 (NON-FATAL): 형식/시크릿 점검만 하고 경고 로그를 남긴다.
  // 실패해도 throw 하지 않으므로 라이브 부팅을 깨뜨리지 않는다.
  validateEnv()

  const app = await NestFactory.create(AppModule)
  app.getHttpAdapter().getInstance().disable('x-powered-by')

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noimageindex')
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    next()
  })

  // 글로벌 Zod 검증 파이프 - createZodDto 스키마 기반 입력 검증(에러 형태 호환 유지)
  app.useGlobalPipes(new ZodValidationPipe())

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  // CORS 설정 - Vite React 프론트엔드에서 NestJS 백엔드로의 요청을 허용
  app.enableCors({
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin, corsOrigins)) return callback(null, true)
      return callback(new Error(`Blocked by CORS: ${origin}`), false)
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  })

  const port = Number(process.env.PORT ?? 3003)
  await app.listen(port)
  console.log(`\n===============================================================`)
  console.log(`  🚀 ProtoLive NestJS Backend running on: http://localhost:${port}`)
  console.log(`  🟢 URL verification and Project APIs are active!`)
  console.log(`===============================================================\n`)
}
bootstrap()
