import type { ProjectsState } from '../project.models'

export interface StoreReadiness {
  ready: boolean
  store: 'ok' | 'unwritable' | 'unreadable' | 'unreachable'
}

/**
 * 영속 계층 추상화. 런타임은 인메모리 상태로 동작한다(읽기는 전부 메모리). 부팅 시 load()로
 * 한 번 하이드레이트하고, 변경 시 save()로 write-behind(파일은 즉시 동기, DB는 디바운스 비동기)하며,
 * 종료 시 flush()로 잔여 쓰기를 비운다. 드라이버는 DATABASE_URL 유무로 선택한다(파일 ↔ Postgres).
 */
export interface ProjectsStore {
  /** 부팅 하이드레이션: 영속된 전체 상태를 한 번 읽어온다. */
  load(): Promise<ProjectsState>
  /** write-behind 저장. 호출부(서비스 persist())는 동기로 유지되도록 즉시 반환한다. */
  save(state: ProjectsState): void
  /** 보류 중인 쓰기를 모두 비운다(graceful shutdown). */
  flush(): Promise<void>
  /** 리드니스 프로브(/api/health/ready). */
  checkReadiness(): Promise<StoreReadiness>
}

/** ProjectsStore DI 토큰. StoreModule이 DATABASE_URL 유무로 드라이버를 주입한다. */
export const PROJECTS_STORE = Symbol('PROJECTS_STORE')
