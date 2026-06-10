import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  POLICY_PAGES,
  TERMSDESK_SUPPORT_URL,
  fetchPublicPolicy,
  formatPolicyDate,
  parsePolicyBlocks,
  policyExternalUrl,
  shortContentHash,
  type PublicPolicy,
} from './termsdesk'

const samplePolicy: PublicPolicy = {
  orgName: 'ProtoLive',
  policySlug: 'terms-of-service',
  name: '이용약관',
  type: 'terms',
  locale: 'ko',
  versionLabel: 'v1',
  contentHash: '12b390fde0d486e04b621aa7a56bd701456613fc1dc0ed80eb1f24c8dae61e8d',
  body: '제1조 (목적)\n이 약관은 목적을 정합니다.',
  effectiveAt: '2026-06-08T00:00:00.000Z',
  publishedAt: '2026-06-08T00:00:00.000Z',
  changeSummary: 'TermsDesk 중앙 게시본으로 이전',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parsePolicyBlocks', () => {
  it('splits TermsDesk article-style bodies into heading/paragraph blocks', () => {
    const blocks = parsePolicyBlocks(
      '제1조 (목적)\n이 약관은 서비스 이용 조건을 정합니다.\n\n제2조 (서비스 범위)\n첫 줄.\n둘째 줄.'
    )

    expect(blocks).toEqual([
      { kind: 'heading', text: '제1조 (목적)' },
      { kind: 'paragraph', text: '이 약관은 서비스 이용 조건을 정합니다.' },
      { kind: 'heading', text: '제2조 (서비스 범위)' },
      { kind: 'paragraph', text: '첫 줄.\n둘째 줄.' },
    ])
  })

  it('parses markdown headings and dash lists without injecting markup', () => {
    const blocks = parsePolicyBlocks(
      '## 처리 항목\n다음 정보를 처리합니다.\n- 계정 정보: 이메일\n- 이용 기록\n끝 문단.'
    )

    expect(blocks).toEqual([
      { kind: 'heading', text: '처리 항목' },
      { kind: 'paragraph', text: '다음 정보를 처리합니다.' },
      { kind: 'list', items: ['계정 정보: 이메일', '이용 기록'] },
      { kind: 'paragraph', text: '끝 문단.' },
    ])
  })

  it('treats fullwidth-parenthesis article headings as headings too', () => {
    expect(parsePolicyBlocks('제3조（보유 기간）')).toEqual([
      { kind: 'heading', text: '제3조（보유 기간）' },
    ])
  })

  it('returns no blocks for empty bodies', () => {
    expect(parsePolicyBlocks('')).toEqual([])
    expect(parsePolicyBlocks('\n\n')).toEqual([])
  })
})

describe('policy metadata helpers', () => {
  it('keeps the org slug and policy slugs aligned with TermsDesk publication', () => {
    expect(POLICY_PAGES.terms.slug).toBe('terms-of-service')
    expect(POLICY_PAGES.privacy.slug).toBe('privacy-policy')
    expect(policyExternalUrl('terms-of-service')).toBe(
      'https://termsdesk.vercel.app/p/proto-live/terms-of-service'
    )
    expect(TERMSDESK_SUPPORT_URL).toBe('https://termsdesk.vercel.app/support/proto-live')
  })

  it('shortens the content hash to its 12-char trust prefix', () => {
    expect(shortContentHash(samplePolicy.contentHash)).toBe('12b390fde0d4')
  })

  it('formats effective dates in Korean and keeps invalid input as-is', () => {
    expect(formatPolicyDate('2026-06-08T00:00:00.000Z')).toContain('2026')
    expect(formatPolicyDate('정해지지 않음')).toBe('정해지지 않음')
  })
})

describe('fetchPublicPolicy', () => {
  it('requests the public JSON endpoint and returns the parsed policy', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => samplePolicy,
    }))
    vi.stubGlobal('fetch', fetchMock)

    const policy = await fetchPublicPolicy('terms-of-service')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://termsdesk.vercel.app/api/public/proto-live/policies/terms-of-service',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    )
    expect(policy).toEqual(samplePolicy)
  })

  it('rejects on non-2xx responses so the page can show the fallback card', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }))
    )

    await expect(fetchPublicPolicy('terms-of-service')).rejects.toThrow('404')
  })
})
