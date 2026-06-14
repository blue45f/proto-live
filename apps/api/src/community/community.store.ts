import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'

import { Logger } from '@nestjs/common'
import { Pool } from 'pg'

import {
  CommunityState,
  SerializedCommunityState,
  createEmptyCommunityState,
  deserializeCommunityState,
  serializeCommunityState,
} from './community.models'

/**
 * 커뮤니티 영속 계층 — projects 스토어(ProjectsStore)와 같은 운영 모델을 따르되 완전히 분리된
 * 별도 드라이버다(projects store 인터페이스/드라이버는 불가침). 런타임은 인메모리, 부팅 시
 * load() 한 번, 변경 시 save() write-behind, 종료 시 flush().
 */
export interface CommunityStore {
  load(): Promise<CommunityState>
  save(state: CommunityState): void
  flush(): Promise<void>
  checkReadiness(): Promise<{ ready: boolean; store: string }>
}

/** CommunityStore DI 토큰. CommunityModule 이 DATABASE_URL 유무로 드라이버를 주입한다. */
export const COMMUNITY_STORE = Symbol('COMMUNITY_STORE')

function defaultCommunityStorePath(): string {
  return process.env.COMMUNITY_STORE_PATH ?? join(process.cwd(), 'data', 'protolive-community.json')
}

/** 파일(JSON) 드라이버 — 테스트·로컬 기본값. 원자적 쓰기(tmp→rename)는 projects 패턴과 동일. */
export class FileCommunityStore implements CommunityStore {
  constructor(private readonly filePath = defaultCommunityStorePath()) {}

  async load(): Promise<CommunityState> {
    if (!existsSync(this.filePath)) {
      return createEmptyCommunityState()
    }
    const contents = readFileSync(this.filePath, 'utf8')
    if (!contents.trim()) {
      return createEmptyCommunityState()
    }
    return deserializeCommunityState(JSON.parse(contents) as SerializedCommunityState)
  }

  save(state: CommunityState): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`
    writeFileSync(
      temporaryPath,
      `${JSON.stringify(serializeCommunityState(state), null, 2)}\n`,
      'utf8'
    )
    renameSync(temporaryPath, this.filePath)
  }

  async flush(): Promise<void> {
    // 파일 write 는 save() 에서 즉시 동기 완료된다.
  }

  async checkReadiness(): Promise<{ ready: boolean; store: string }> {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      accessSync(dirname(this.filePath), fsConstants.W_OK)
    } catch {
      return { ready: false, store: 'unwritable' }
    }
    try {
      await this.load()
    } catch {
      return { ready: false, store: 'unreadable' }
    }
    return { ready: true, store: 'ok' }
  }
}

const WRITE_BEHIND_DEBOUNCE_MS = 150

/**
 * Postgres 드라이버 — community_state 단일 행(jsonb) 스냅샷 영속. app_meta 와 같은 패턴이며
 * idempotent DDL 로 부팅을 보장한다. 디바운스 write-behind + 직렬 체인은 projects PG 드라이버와 동일.
 */
export class PostgresCommunityStore implements CommunityStore {
  private readonly logger = new Logger(PostgresCommunityStore.name)
  private readonly pool: Pool
  private schemaReady: Promise<void> | null = null

  private latest: CommunityState | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private chain: Promise<void> = Promise.resolve()

  constructor(connectionString: string) {
    const needsSsl = /neon\.tech|sslmode=require|render\.com/i.test(connectionString)
    this.pool = new Pool({
      connectionString,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  }

  async load(): Promise<CommunityState> {
    await this.ensureSchema()
    const result = await this.pool.query<{ data: SerializedCommunityState }>(
      'SELECT data FROM community_state WHERE id = 1'
    )
    if (result.rows.length === 0) {
      return createEmptyCommunityState()
    }
    return deserializeCommunityState(result.rows[0].data)
  }

  save(state: CommunityState): void {
    this.latest = state
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null
        void this.drain()
      }, WRITE_BEHIND_DEBOUNCE_MS)
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this.drain()
    await this.chain
  }

  async checkReadiness(): Promise<{ ready: boolean; store: string }> {
    try {
      await this.ensureSchema()
      await this.pool.query('SELECT 1')
      return { ready: true, store: 'ok' }
    } catch (error) {
      this.logger.error(`Postgres community readiness probe failed: ${(error as Error).message}`)
      return { ready: false, store: 'unreachable' }
    }
  }

  private drain(): Promise<void> {
    if (this.latest === null) {
      return this.chain
    }
    const state = this.latest
    this.latest = null
    this.chain = this.chain
      .then(() => this.persist(state))
      .catch((error) => {
        this.logger.error(`community write-behind persist 실패: ${(error as Error).message}`)
      })
    return this.chain
  }

  private async persist(state: CommunityState): Promise<void> {
    await this.ensureSchema()
    const serialized = serializeCommunityState(state)
    await this.pool.query(
      `INSERT INTO community_state (id, data) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [JSON.stringify(serialized)]
    )
  }

  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.pool
        .query(
          'CREATE TABLE IF NOT EXISTS community_state (id integer PRIMARY KEY, data jsonb NOT NULL)'
        )
        .then(() => undefined)
        .catch((error) => {
          this.schemaReady = null
          throw error
        })
    }
    return this.schemaReady
  }
}

/** DATABASE_URL 유무로 드라이버 선택 — projects StoreModule 의 팩토리 규약과 동일. */
export function createCommunityStore(): CommunityStore {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (connectionString) {
    new Logger('CommunityModule').log('커뮤니티 영속 드라이버: Postgres (DATABASE_URL 감지)')
    return new PostgresCommunityStore(connectionString)
  }
  new Logger('CommunityModule').log('커뮤니티 영속 드라이버: 파일(JSON) — DATABASE_URL 미설정')
  return new FileCommunityStore()
}
