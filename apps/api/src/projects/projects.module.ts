import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { NotificationsController } from './notifications.controller'
import { ProjectsController } from './projects.controller'
import { ProjectsService, resolveSessionSecret } from './projects.service'
import { SeoController } from './seo.controller'

@Module({
  imports: [
    // 세션 토큰을 @nestjs/jwt(HS256)로 서명/검증한다. 시크릿은 기존 HMAC 세션과
    // 동일하게 PROTOLIVE_SESSION_SECRET 에서 해석한다(프로덕션 필수, 개발은 임의값).
    JwtModule.register({
      secret: resolveSessionSecret(),
      signOptions: { algorithm: 'HS256' },
    }),
  ],
  controllers: [ProjectsController, SeoController, NotificationsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
