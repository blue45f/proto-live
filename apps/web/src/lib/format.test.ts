import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildProjectShareUrl, formatChallengeDday } from './format'

describe('formatChallengeDday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts remaining days by local calendar day, not elapsed hours', () => {
    // 오늘 정오 기준 내일 자정 직전 마감 — 시간 차는 36시간이지만 달력으론 하루 뒤.
    expect(formatChallengeDday('2026-06-11T23:59:59')).toBe('마감 D-1')
    expect(formatChallengeDday('2026-06-13T00:00:01')).toBe('마감 D-3')
  })

  it('labels a same-day deadline as due today even when the time has passed', () => {
    expect(formatChallengeDday('2026-06-10T23:59:59')).toBe('오늘 마감')
    expect(formatChallengeDday('2026-06-10T00:00:01')).toBe('오늘 마감')
  })

  it('labels past deadlines as closed', () => {
    expect(formatChallengeDday('2026-06-09T23:59:59')).toBe('마감됨')
  })

  it('returns null for unparseable dates so the banner can skip the chip', () => {
    expect(formatChallengeDday('not-a-date')).toBeNull()
  })
})

describe('buildProjectShareUrl', () => {
  it('builds an absolute detail URL on the current origin (browser env)', () => {
    // jsdom 환경이라 window.location.origin 이 존재한다 — 상세 라우트와 동일한 경로.
    expect(buildProjectShareUrl(42)).toBe(`${globalThis.location.origin}/projects/42`)
  })

  it('matches the canonical detail route path segment', () => {
    expect(buildProjectShareUrl(7).endsWith('/projects/7')).toBe(true)
  })
})
