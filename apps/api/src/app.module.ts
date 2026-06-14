import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'

import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { RateLimitMiddleware } from './common/rate-limit.middleware'
import { CommunityModule } from './community/community.module'
import { HealthModule } from './health/health.module'
import { ProjectsModule } from './projects/projects.module'
import { StoreModule } from './projects/store/store.module'

@Module({
  imports: [
    // 구조화 로깅(nestjs-pino). 개발/테스트는 pino-pretty 로 가독성 있게,
    // 프로덕션은 JSON 라인으로 출력한다. 인증/쿠키 헤더는 redact 한다.
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    StoreModule,
    ProjectsModule,
    CommunityModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    // 글로벌 예외 필터 — 일관된 에러 envelope(역호환) + 5xx pino 로깅.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*')
  }
}
