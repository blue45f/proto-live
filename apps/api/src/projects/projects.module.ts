import { Module } from '@nestjs/common'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { SeoController } from './seo.controller'

@Module({
  controllers: [ProjectsController, SeoController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
