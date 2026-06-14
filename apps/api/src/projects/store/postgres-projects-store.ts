import { Logger } from '@nestjs/common'
import { asc } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { deserializeState, serializeState, type SerializedProjectsState } from '../projects.store'

import * as schema from './db/schema'

import type { ProjectsState } from '../project.models'
import type { ProjectsStore, StoreReadiness } from './projects-store'

const WRITE_BEHIND_DEBOUNCE_MS = 150

/**
 * Postgres 영속 드라이버. 런타임 서비스는 인메모리 전체 상태로 동작하므로, 이 드라이버는
 * 부팅 시 전체 상태를 조립해 돌려주고(load), 변경은 디바운스 write-behind로 트랜잭션 영속한다(save/flush).
 * 직렬화는 파일 드라이버와 동일한 serializeState/deserializeState를 재사용한다(검증된 Date 변환·백필).
 *
 * 스키마는 부팅 시 idempotent DDL(CREATE TABLE IF NOT EXISTS)로 보장한다 — OCI 단일 VM에서
 * 별도 마이그레이션 단계 없이 견고하게 부팅된다. (per-entity 쿼리로 이전 시 drizzle-kit 도입 가능.)
 */
export class PostgresProjectsStore implements ProjectsStore {
  private readonly logger = new Logger(PostgresProjectsStore.name)
  private readonly pool: Pool
  private readonly db: NodePgDatabase<typeof schema>
  private schemaReady: Promise<void> | null = null

  private latest: ProjectsState | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private chain: Promise<void> = Promise.resolve()

  constructor(connectionString: string) {
    const needsSsl = /neon\.tech|sslmode=require|render\.com/i.test(connectionString)
    this.pool = new Pool({
      connectionString,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    })
    this.db = drizzle(this.pool, { schema })
  }

  async load(): Promise<ProjectsState> {
    await this.ensureSchema()
    const [
      users,
      projects,
      proposals,
      events,
      reviews,
      upvotes,
      logEntries,
      notifications,
      auditLogs,
      meta,
    ] = await Promise.all([
      this.db.select().from(schema.usersTable).orderBy(asc(schema.usersTable.id)),
      this.db.select().from(schema.projectsTable).orderBy(asc(schema.projectsTable.id)),
      this.db.select().from(schema.proposalsTable).orderBy(asc(schema.proposalsTable.id)),
      this.db.select().from(schema.eventsTable).orderBy(asc(schema.eventsTable.id)),
      this.db.select().from(schema.reviewsTable).orderBy(asc(schema.reviewsTable.id)),
      this.db.select().from(schema.upvotesTable).orderBy(asc(schema.upvotesTable.id)),
      this.db.select().from(schema.logEntriesTable).orderBy(asc(schema.logEntriesTable.id)),
      this.db.select().from(schema.notificationsTable).orderBy(asc(schema.notificationsTable.id)),
      this.db.select().from(schema.auditLogsTable).orderBy(asc(schema.auditLogsTable.id)),
      this.db.select().from(schema.appMetaTable),
    ])

    const metaData = (meta[0]?.data as Record<string, unknown> | undefined) ?? {}
    const serialized = {
      users: users.map((row) => row.data),
      projects: projects.map((row) => row.data),
      proposals: proposals.map((row) => row.data),
      events: events.map((row) => row.data),
      reviews: reviews.map((row) => row.data),
      upvotes: upvotes.map((row) => row.data),
      logEntries: logEntries.map((row) => row.data),
      notifications: notifications.map((row) => row.data),
      auditLogs: auditLogs.map((row) => row.data),
      challenge: metaData.challenge ?? null,
      nextUserId: metaData.nextUserId,
      nextProjectId: metaData.nextProjectId,
      nextProposalId: metaData.nextProposalId,
      nextEventId: metaData.nextEventId,
      nextUpvoteId: metaData.nextUpvoteId,
      nextLogEntryId: metaData.nextLogEntryId,
      nextNotificationId: metaData.nextNotificationId,
      nextReviewId: metaData.nextReviewId,
      nextAuditLogId: metaData.nextAuditLogId,
    } as unknown as SerializedProjectsState

    return deserializeState(serialized)
  }

  save(state: ProjectsState): void {
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

  async checkReadiness(): Promise<StoreReadiness> {
    try {
      await this.ensureSchema()
      await this.pool.query('SELECT 1')
      return { ready: true, store: 'ok' }
    } catch (error) {
      this.logger.error(`Postgres readiness probe failed: ${(error as Error).message}`)
      return { ready: false, store: 'unreachable' }
    }
  }

  /** 보류 중인 최신 상태를 직렬 큐에 태워 영속한다(중복 호출 코얼레싱). */
  private drain(): Promise<void> {
    if (this.latest === null) {
      return this.chain
    }
    const state = this.latest
    this.latest = null
    this.chain = this.chain
      .then(() => this.persist(state))
      .catch((error) => {
        this.logger.error(`write-behind persist 실패: ${(error as Error).message}`)
      })
    return this.chain
  }

  private async persist(state: ProjectsState): Promise<void> {
    await this.ensureSchema()
    const s = serializeState(state)

    await this.db.transaction(async (tx) => {
      await tx.delete(schema.usersTable)
      if (s.users.length) {
        await tx.insert(schema.usersTable).values(s.users.map((u) => ({ id: u.id, data: u })))
      }

      await tx.delete(schema.projectsTable)
      if (s.projects.length) {
        await tx.insert(schema.projectsTable).values(
          s.projects.map((p) => ({
            id: p.id,
            userId: p.userId,
            maturity: p.maturity ?? null,
            createdAt: new Date(p.createdAt),
            data: p,
          }))
        )
      }

      await tx.delete(schema.proposalsTable)
      if (s.proposals.length) {
        await tx.insert(schema.proposalsTable).values(
          s.proposals.map((p) => ({
            id: p.id,
            projectId: p.projectId,
            createdAt: new Date(p.createdAt),
            data: p,
          }))
        )
      }

      await tx.delete(schema.eventsTable)
      if (s.events.length) {
        await tx.insert(schema.eventsTable).values(
          s.events.map((e) => ({
            id: e.id,
            projectId: e.projectId,
            type: e.type ?? null,
            createdAt: new Date(e.createdAt),
            data: e,
          }))
        )
      }

      await tx.delete(schema.reviewsTable)
      if (s.reviews.length) {
        await tx.insert(schema.reviewsTable).values(
          s.reviews.map((r) => ({
            id: r.id,
            projectId: r.projectId,
            parentId: r.parentId ?? null,
            status: r.status ?? null,
            createdAt: new Date(r.createdAt),
            data: r,
          }))
        )
      }

      await tx.delete(schema.upvotesTable)
      if (s.upvotes.length) {
        await tx.insert(schema.upvotesTable).values(
          s.upvotes.map((u) => ({
            id: u.id,
            projectId: u.projectId,
            createdAt: new Date(u.createdAt),
            data: u,
          }))
        )
      }

      await tx.delete(schema.logEntriesTable)
      if (s.logEntries.length) {
        await tx.insert(schema.logEntriesTable).values(
          s.logEntries.map((entry) => ({
            id: entry.id,
            projectId: entry.projectId,
            createdAt: new Date(entry.createdAt),
            data: entry,
          }))
        )
      }

      await tx.delete(schema.notificationsTable)
      if (s.notifications.length) {
        await tx.insert(schema.notificationsTable).values(
          s.notifications.map((notification) => ({
            id: notification.id,
            userEmail: notification.userEmail,
            projectId: notification.projectId,
            createdAt: new Date(notification.createdAt),
            data: notification,
          }))
        )
      }

      await tx.delete(schema.auditLogsTable)
      if (s.auditLogs.length) {
        await tx.insert(schema.auditLogsTable).values(
          s.auditLogs.map((entry) => ({
            id: entry.id,
            createdAt: new Date(entry.createdAt),
            data: entry,
          }))
        )
      }

      await tx.delete(schema.appMetaTable)
      await tx.insert(schema.appMetaTable).values([
        {
          id: 1,
          data: {
            challenge: s.challenge ?? null,
            nextUserId: s.nextUserId,
            nextProjectId: s.nextProjectId,
            nextProposalId: s.nextProposalId,
            nextEventId: s.nextEventId,
            nextUpvoteId: s.nextUpvoteId,
            nextLogEntryId: s.nextLogEntryId,
            nextNotificationId: s.nextNotificationId,
            nextReviewId: s.nextReviewId,
            nextAuditLogId: s.nextAuditLogId,
          },
        },
      ])
    })
  }

  /** 부팅/최초 영속 시 idempotent DDL로 스키마를 보장한다(한 번만 실행). */
  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.createSchema().catch((error) => {
        this.schemaReady = null
        throw error
      })
    }
    return this.schemaReady
  }

  private async createSchema(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (id integer PRIMARY KEY, data jsonb NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS projects (id integer PRIMARY KEY, user_id integer NOT NULL, maturity text, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id)`,
      `CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects (created_at)`,
      `CREATE INDEX IF NOT EXISTS projects_maturity_idx ON projects (maturity)`,
      `CREATE TABLE IF NOT EXISTS proposals (id integer PRIMARY KEY, project_id integer NOT NULL, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS proposals_project_id_idx ON proposals (project_id)`,
      `CREATE TABLE IF NOT EXISTS project_events (id integer PRIMARY KEY, project_id integer NOT NULL, type text, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS events_project_id_idx ON project_events (project_id)`,
      `CREATE INDEX IF NOT EXISTS events_created_at_idx ON project_events (created_at)`,
      `CREATE TABLE IF NOT EXISTS project_reviews (id integer PRIMARY KEY, project_id integer NOT NULL, parent_id integer, status text, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS reviews_project_id_idx ON project_reviews (project_id)`,
      `CREATE INDEX IF NOT EXISTS reviews_status_idx ON project_reviews (status)`,
      `CREATE TABLE IF NOT EXISTS project_upvotes (id integer PRIMARY KEY, project_id integer NOT NULL, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS upvotes_project_id_idx ON project_upvotes (project_id)`,
      `CREATE TABLE IF NOT EXISTS project_log_entries (id integer PRIMARY KEY, project_id integer NOT NULL, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS log_entries_project_id_idx ON project_log_entries (project_id)`,
      `CREATE TABLE IF NOT EXISTS notifications (id integer PRIMARY KEY, user_email text NOT NULL, project_id integer NOT NULL, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS notifications_user_email_idx ON notifications (user_email)`,
      `CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at)`,
      `CREATE TABLE IF NOT EXISTS audit_logs (id integer PRIMARY KEY, created_at timestamptz NOT NULL, data jsonb NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at)`,
      `CREATE TABLE IF NOT EXISTS app_meta (id integer PRIMARY KEY, data jsonb NOT NULL)`,
    ]
    for (const statement of statements) {
      await this.pool.query(statement)
    }
  }
}
