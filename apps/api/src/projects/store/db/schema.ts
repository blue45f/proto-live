import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Postgres 영속 스키마(하이브리드). 각 엔티티는 조회/정렬용 키 컬럼(id·FK·created_at·상태)과
 * 직렬화된 전체 객체를 담는 jsonb `data` 컬럼을 함께 가진다. 런타임 서비스는 전체 상태를
 * 인메모리로 로드하므로 지금은 `data`만 읽어 재조립하지만, 키 컬럼·인덱스를 미리 둬서
 * 후속 per-entity 쿼리(목록/페이지네이션) 최적화로 점진 이전할 수 있게 한다.
 */

export const usersTable = pgTable('users', {
  id: integer('id').primaryKey(),
  data: jsonb('data').notNull(),
})

export const projectsTable = pgTable(
  'projects',
  {
    id: integer('id').primaryKey(),
    userId: integer('user_id').notNull(),
    maturity: text('maturity'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [
    index('projects_user_id_idx').on(t.userId),
    index('projects_created_at_idx').on(t.createdAt),
    index('projects_maturity_idx').on(t.maturity),
  ]
)

export const proposalsTable = pgTable(
  'proposals',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [index('proposals_project_id_idx').on(t.projectId)]
)

export const eventsTable = pgTable(
  'project_events',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id').notNull(),
    type: text('type'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [
    index('events_project_id_idx').on(t.projectId),
    index('events_created_at_idx').on(t.createdAt),
  ]
)

export const reviewsTable = pgTable(
  'project_reviews',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id').notNull(),
    parentId: integer('parent_id'),
    status: text('status'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [
    index('reviews_project_id_idx').on(t.projectId),
    index('reviews_status_idx').on(t.status),
  ]
)

export const upvotesTable = pgTable(
  'project_upvotes',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [index('upvotes_project_id_idx').on(t.projectId)]
)

export const logEntriesTable = pgTable(
  'project_log_entries',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [index('log_entries_project_id_idx').on(t.projectId)]
)

export const auditLogsTable = pgTable(
  'audit_logs',
  {
    id: integer('id').primaryKey(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [index('audit_logs_created_at_idx').on(t.createdAt)]
)

export const notificationsTable = pgTable(
  'notifications',
  {
    id: integer('id').primaryKey(),
    userEmail: text('user_email').notNull(),
    projectId: integer('project_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
    data: jsonb('data').notNull(),
  },
  (t) => [
    index('notifications_user_email_idx').on(t.userEmail),
    index('notifications_created_at_idx').on(t.createdAt),
  ]
)

/** 단일 행(id=1): 시즌 챌린지 + 모든 next* 카운터를 담는다. */
export const appMetaTable = pgTable('app_meta', {
  id: integer('id').primaryKey(),
  data: jsonb('data').notNull(),
})
