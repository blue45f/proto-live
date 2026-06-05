import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { ProjectsService } from './projects.service'
import type { AppNotification } from './project.models'
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto'

/**
 * 인앱 알림. 로그인 사용자(주로 메이커)가 자기 프로젝트에 받은 활동 알림을 조회/읽음 처리한다.
 * `api/projects/:id`와의 라우트 충돌을 피하려 별도 컨트롤러(api/notifications)로 분리했다.
 */
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Req() request: Request): AppNotification[] {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.projectsService.getNotifications(session.email)
  }

  @Post('read')
  markRead(@Req() request: Request, @Body() body: MarkNotificationsReadDto): { read: number } {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return { read: this.projectsService.markNotificationsRead(session.email, body.ids) }
  }
}
