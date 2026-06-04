import { JsonProjectsStore } from '../projects.store'
import type { ProjectsState } from '../project.models'
import type { ProjectsStore, StoreReadiness } from './projects-store'

/**
 * 파일(JSON) 영속 드라이버. 기존 동기 JsonProjectsStore를 비동기 ProjectsStore 인터페이스로 감싼다.
 * 테스트·로컬 기본값이며 DATABASE_URL 미설정 시 사용된다. 파일 write는 빠르므로 save는 즉시 동기 기록.
 */
export class FileProjectsStore implements ProjectsStore {
  private readonly json: JsonProjectsStore

  constructor(filePath?: string) {
    this.json = new JsonProjectsStore(filePath)
  }

  async load(): Promise<ProjectsState> {
    return this.json.read()
  }

  save(state: ProjectsState): void {
    this.json.write(state)
  }

  async flush(): Promise<void> {
    // 파일 write는 save()에서 즉시 동기 완료되므로 비울 잔여 쓰기가 없다.
  }

  async checkReadiness(): Promise<StoreReadiness> {
    return this.json.checkReadiness()
  }
}
