import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { RateLimitMiddleware } from './common/rate-limit.middleware'
import { ProjectsModule } from './projects/projects.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [ProjectsModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*')
  }
}
