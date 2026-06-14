import { Module } from '@nestjs/common'

import { ProjectsModule } from '../projects/projects.module'

import { CommunityController } from './community.controller'
import { CommunityService } from './community.service'
import { COMMUNITY_STORE, createCommunityStore } from './community.store'

/**
 * 커뮤니티 모듈 — 토론/댓글/첨부/쪽지. projects 모듈과 같은 결(컨트롤러+서비스+영속 드라이버)을
 * 따르되, 상태와 영속 계층은 완전히 분리된 별도 스토어를 쓴다(projects 스토어 불가침).
 */
@Module({
  imports: [ProjectsModule],
  controllers: [CommunityController],
  providers: [CommunityService, { provide: COMMUNITY_STORE, useFactory: createCommunityStore }],
})
export class CommunityModule {}
