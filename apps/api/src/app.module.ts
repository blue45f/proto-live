import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { RateLimitMiddleware } from './common/rate-limit.middleware'
import { ProjectsModule } from './projects/projects.module'
import { CommunityModule } from './community/community.module'
import { HealthModule } from './health/health.module'
import { StoreModule } from './projects/store/store.module'

@Module({
  imports: [StoreModule, ProjectsModule, CommunityModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*')
  }
}
