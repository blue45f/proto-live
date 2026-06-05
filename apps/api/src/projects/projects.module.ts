import { Module } from '@nestjs/common'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { SeoController } from './seo.controller'
import { NotificationsController } from './notifications.controller'

@Module({
  controllers: [ProjectsController, SeoController, NotificationsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
