import { Global, Logger, Module } from '@nestjs/common'

import { FileProjectsStore } from './file-projects-store'
import { PostgresProjectsStore } from './postgres-projects-store'
import { PROJECTS_STORE, type ProjectsStore } from './projects-store'

/**
 * DATABASE_URL이 있으면 Postgres 드라이버를, 없으면 파일(JSON) 드라이버를 만든다.
 * 테스트·로컬은 보통 파일, prod/OCI는 Postgres.
 */
export function createProjectsStore(): ProjectsStore {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (connectionString) {
    new Logger('StoreModule').log('영속 드라이버: Postgres (DATABASE_URL 감지)')
    return new PostgresProjectsStore(connectionString)
  }
  new Logger('StoreModule').log('영속 드라이버: 파일(JSON) — DATABASE_URL 미설정')
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
