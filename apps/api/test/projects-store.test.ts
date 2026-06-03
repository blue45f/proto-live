import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { JsonProjectsStore } from '../src/projects/projects.store'
import { createEmptyProjectsState } from '../src/projects/project.models'

test('JsonProjectsStore starts empty when the file does not exist', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-store-'))
  try {
    const store = new JsonProjectsStore(join(dir, 'store.json'))

    assert.deepEqual(store.read(), createEmptyProjectsState())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('JsonProjectsStore persists projects, users, proposals, and next ids', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-store-'))
  try {
    const filePath = join(dir, 'store.json')
    const store = new JsonProjectsStore(filePath)
    const state = createEmptyProjectsState()

    state.users.push({
      id: 7,
      email: 'maker@example.com',
      role: 'maker',
    })
    state.projects.push({
      id: 12,
      userId: 7,
      title: 'Persistent MVP',
      description: 'A project that survives process restarts.',
      liveUrl: 'https://example.org/',
      category: 'AI & SaaS',
      accessMode: 'screened',
      protectionNoticeAccepted: true,
      thumbnail: null,
      investorCount: 1,
      matchCount: 1,
      committedAmountMin: 10000000,
      committedAmountMax: 30000000,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        checkedAt: '2026-06-01T00:00:00.000Z',
        finalUrl: 'https://example.org/',
        responseTimeMs: 120,
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    state.proposals.push({
      id: 3,
      projectId: 12,
      investorEmail: 'investor@example.com',
      fundingRangeId: 'pre-seed-10-30',
      message: 'Let us talk.',
      legalNoticeAccepted: true,
      privacyConsentAccepted: true,
      riskNoticeAccepted: true,
      complianceAcceptedAt: new Date('2026-06-01T00:01:00.000Z'),
      status: 'submitted',
      createdAt: new Date('2026-06-01T00:01:00.000Z'),
    })
    state.auditLogs.push({
      id: 1,
      action: 'match_compliance_accepted',
      actorEmail: 'investor@example.com',
      targetType: 'project',
      targetId: 12,
      projectId: 12,
      message: 'Consent recorded.',
      createdAt: new Date('2026-06-01T00:01:30.000Z'),
    })
    state.events.push({
      id: 9,
      projectId: 12,
      type: 'preview',
      createdAt: new Date('2026-06-01T00:02:00.000Z'),
    })
    state.nextUserId = 8
    state.nextProjectId = 13
    state.nextProposalId = 4
    state.nextEventId = 10
    state.nextAuditLogId = 2

    store.write(state)

    assert.deepEqual(new JsonProjectsStore(filePath).read(), state)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
