import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { BadRequestException } from '@nestjs/common'
import { ProjectsService } from '../src/projects/projects.service'
import { createEmptyProjectsState } from '../src/projects/project.models'
import { JsonProjectsStore } from '../src/projects/projects.store'
import { getCurrentConsentTerms } from '../src/projects/consent-terms'
import { FUNDING_RANGES } from '../src/projects/project.constants'

async function withService(run: (service: ProjectsService, storePath: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-consent-'))
  const previous = process.env.PROJECT_STORE_PATH
  const filePath = join(dir, 'store.json')
  try {
    process.env.PROJECT_STORE_PATH = filePath
    const state = createEmptyProjectsState()
    state.users.push({ id: 1, email: 'maker@example.com', role: 'maker' })
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Consent Demo',
      description: 'A demo for consent integrity.',
      liveUrl: 'https://example.com/consent-demo',
      category: 'AI & SaaS',
      accessMode: 'open',
      protectionNoticeAccepted: true,
      thumbnail: null,
      maturity: 'live',
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        checkedAt: '2026-06-01T00:00:00.000Z',
        finalUrl: 'https://example.com/consent-demo',
        responseTimeMs: 120,
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    state.nextUserId = 2
    state.nextProjectId = 2
    new JsonProjectsStore(filePath).write(state)
    const service = new ProjectsService()
    await service.onModuleInit()
    await run(service, filePath)
  } finally {
    if (previous === undefined) delete process.env.PROJECT_STORE_PATH
    else process.env.PROJECT_STORE_PATH = previous
    rmSync(dir, { recursive: true, force: true })
  }
}

const baseInput = {
  fundingRangeId: FUNDING_RANGES[0].id,
  message: '데모 보고 연락드리고 싶습니다.',
  legalNoticeAccepted: true,
  privacyConsentAccepted: true,
  riskNoticeAccepted: true,
  email: 'investor@example.com',
}

test('동의 후 콜백: 정본 약관 버전/해시가 proposal에 기록된다', async () => {
  await withService(async (service, storePath) => {
    const terms = getCurrentConsentTerms()
    await service.createMatchProposal(1, {
      ...baseInput,
      consentVersion: terms.version,
      consentHash: terms.hash,
    })
    const stored = JSON.parse(readFileSync(storePath, 'utf8'))
    assert.equal(stored.proposals.length, 1)
    assert.equal(stored.proposals[0].consentVersion, terms.version)
    assert.equal(stored.proposals[0].consentHash, terms.hash)
  })
})

test('동의 전 콜백: 약관 해시가 현재와 다르면(재동의) 거부한다', async () => {
  await withService(async (service) => {
    await assert.rejects(
      () =>
        service.createMatchProposal(1, {
          ...baseInput,
          consentVersion: '1999-01-01',
          consentHash: 'stale-hash-does-not-match',
        }),
      (error: unknown) =>
        error instanceof BadRequestException &&
        /약관이 갱신/.test((error as BadRequestException).message)
    )
  })
})

test('동의 전 콜백: 필수 동의 누락 시 거부한다', async () => {
  await withService(async (service) => {
    await assert.rejects(
      () => service.createMatchProposal(1, { ...baseInput, riskNoticeAccepted: false }),
      (error: unknown) => error instanceof BadRequestException
    )
  })
})

test('하위호환: consent 버전/해시 미전송이면 현재 약관으로 기록(거부 없음)', async () => {
  await withService(async (service, storePath) => {
    await service.createMatchProposal(1, { ...baseInput })
    const stored = JSON.parse(readFileSync(storePath, 'utf8'))
    assert.equal(stored.proposals[0].consentVersion, getCurrentConsentTerms().version)
  })
})
