import { Global, Module } from '@nestjs/common'
import { PROJECTS_STORE, type ProjectsStore } from './projects-store'
import { FileProjectsStore } from './file-projects-store'

/**
 * DATABASE_URL이 있으면 Postgres 드라이버를, 없으면 파일 드라이버를 만든다.
 * (Postgres 드라이버는 후속 PR에서 추가 — 그 전까지는 항상 파일.)
 */
export function createProjectsStore(): ProjectsStore {
  return new FileProjectsStore()
}

/**
 * 영속 드라이버를 앱 전역에 단일 인스턴스로 제공한다. ProjectsService와 HealthController가
 * 같은 드라이버를 공유하도록 @Global 로 노출한다.
 */
@Global()
@Module({
  providers: [{ provide: PROJECTS_STORE, useFactory: createProjectsStore }],
  exports: [PROJECTS_STORE],
})
export class StoreModule {}
