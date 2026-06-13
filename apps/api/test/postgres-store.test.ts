import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { createEmptyProjectsState } from '../src/projects/project.models'
import { PostgresProjectsStore } from '../src/projects/store/postgres-projects-store'

// DATABASE_URL이 설정된 환경에서만 실행한다(CI는 파일 드라이버라 미설정 → 스킵).
// 로컬 검증: docker postgres 띄우고 DATABASE_URL=postgres://... pnpm --filter protolive-backend test
const databaseUrl = process.env.DATABASE_URL

test(
  'Postgres 드라이버: save → flush → load 라운드트립(재시작 영속)',
  { skip: databaseUrl ? false : 'DATABASE_URL 미설정 — Postgres 통합 테스트 스킵' },
  async () => {
    const url = databaseUrl as string
    const writer = new PostgresProjectsStore(url)

    const state = createEmptyProjectsState()
    state.users.push({ id: 1, email: 'maker@example.com', role: 'maker' })
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Round Trip MVP',
      description: 'Postgres 영속 라운드트립 검증용 프로젝트.',
      liveUrl: 'https://example.com/roundtrip',
      category: 'AI & SaaS',
      accessMode: 'open',
      protectionNoticeAccepted: true,
      thumbnail: null,
      maturity: 'live',
      builtWith: ['cursor', 'claude-code'],
      vibeCoded: true,
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        responseTimeMs: 120,
        finalUrl: 'https://example.com/roundtrip',
        checkedAt: '2026-06-01T00:00:00.000Z',
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      tags: ['검증', '영속'],
    })
    state.upvotes.push({ id: 1, projectId: 1, email: 'fan@example.com', createdAt: new Date() })
    state.nextUserId = 2
    state.nextProjectId = 2
    state.nextUpvoteId = 2

    writer.save(state)
    await writer.flush()

    // 새 인스턴스로 로드 → 재시작 후에도 데이터가 보존되는지 확인.
    const reader = new PostgresProjectsStore(url)
    const loaded = await reader.load()

    assert.equal(loaded.projects.length, 1)
    assert.equal(loaded.projects[0].title, 'Round Trip MVP')
    assert.equal(loaded.projects[0].maturity, 'live')
    assert.deepEqual(loaded.projects[0].builtWith, ['cursor', 'claude-code'])
    assert.ok(loaded.projects[0].createdAt instanceof Date)
    assert.equal(loaded.users.length, 1)
    assert.equal(loaded.upvotes.length, 1)
    assert.equal(loaded.nextProjectId, 2)

    // 덮어쓰기 검증: 빈 상태로 저장하면 모든 행이 비워진다.
    writer.save(createEmptyProjectsState())
    await writer.flush()
    const cleared = await new PostgresProjectsStore(url).load()
    assert.equal(cleared.projects.length, 0)
    assert.equal(cleared.users.length, 0)
  }
)
