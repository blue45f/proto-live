import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  INQUIRY_CATEGORIES,
  INQUIRY_ENDPOINT,
  buildInquiryPayload,
  createInquiry,
  extractInquiryErrorMessage,
  validateInquiryInput,
  type InquiryReceipt,
} from './inquiries'

const receipt: InquiryReceipt = {
  id: 'inq_01HZX',
  siteSlug: 'proto-live',
  category: 'qa',
  status: 'new',
  createdAt: '2026-06-11T09:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validateInquiryInput', () => {
  it('enforces the TermsDesk contract: title 2..140, body 10..4000', () => {
    expect(
      validateInquiryInput({ category: 'qa', title: '제', body: '열 자가 넘는 정상 본문입니다.' })
    ).toMatch(/제목은/)
    expect(validateInquiryInput({ category: 'qa', title: '정상 제목', body: '짧음' })).toMatch(
      /내용은/
    )
    expect(
      validateInquiryInput({
        category: 'qa',
        title: '정상 제목',
        body: '열 자가 넘는 정상 본문입니다.',
      })
    ).toBeNull()
  })

  it('accepts an empty contact email but rejects a malformed one', () => {
    const base = { category: 'bug' as const, title: '버그', body: '재현 절차를 적어둔 본문입니다.' }
    expect(validateInquiryInput({ ...base, contactEmail: '' })).toBeNull()
    expect(validateInquiryInput({ ...base, contactEmail: 'not-an-email' })).toMatch(/이메일/)
    expect(validateInquiryInput({ ...base, contactEmail: 'a@b.co' })).toBeNull()
  })

  it('keeps the category set at the server contract (5 kinds)', () => {
    expect(INQUIRY_CATEGORIES).toEqual(['contact', 'partnership', 'bug', 'qa', 'question'])
  })
})

describe('buildInquiryPayload', () => {
  it('trims fields, drops an empty contactEmail, and always carries the honeypot', () => {
    const payload = buildInquiryPayload(
      {
        category: 'contact',
        title: '  제목  ',
        body: '  본문은 충분히 긴 정상 본문입니다.  ',
        contactEmail: '   ',
      },
      'https://proto-live.vercel.app/support'
    )
    expect(payload.title).toBe('제목')
    expect(payload.body).toBe('본문은 충분히 긴 정상 본문입니다.')
    expect('contactEmail' in payload).toBe(false)
    expect(payload.website).toBe('')
    expect(payload.originUrl).toBe('https://proto-live.vercel.app/support')
  })

  it('caps originUrl at 500 chars (server max)', () => {
    const long = `https://proto-live.vercel.app/${'a'.repeat(600)}`
    const payload = buildInquiryPayload(
      { category: 'qa', title: '제목', body: '열 자가 넘는 정상 본문입니다.' },
      long
    )
    expect(payload.originUrl.length).toBe(500)
  })
})

describe('createInquiry', () => {
  it('POSTs to the TermsDesk inquiries endpoint and returns the receipt', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => receipt,
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createInquiry(
      { category: 'qa', title: '폼 제목', body: '열 자가 넘는 정상 본문입니다.', website: '' },
      'https://proto-live.vercel.app/support'
    )

    expect(result).toEqual(receipt)
    expect(fetchMock).toHaveBeenCalledWith(
      INQUIRY_ENDPOINT,
      expect.objectContaining({ method: 'POST' })
    )
    const requestInit = (fetchMock.mock.calls[0]?.[1] ?? {}) as unknown as RequestInit
    const sent = JSON.parse(String(requestInit.body))
    expect(sent.website).toBe('')
    expect(sent.originUrl).toBe('https://proto-live.vercel.app/support')
  })

  it('surfaces server validation messages and maps 429 to a throttle message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ message: ['title: Too small'] }),
      }))
    )
    await expect(
      createInquiry(
        { category: 'qa', title: '제', body: '열 자가 넘는 정상 본문입니다.' },
        'https://proto-live.vercel.app/support'
      )
    ).rejects.toThrow('title: Too small')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }))
    )
    await expect(
      createInquiry(
        { category: 'qa', title: '제목', body: '열 자가 넘는 정상 본문입니다.' },
        'https://proto-live.vercel.app/support'
      )
    ).rejects.toThrow(/잠시 후/)
  })

  it('turns network failures into a Korean fallback error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )
    await expect(
      createInquiry(
        { category: 'contact', title: '제목', body: '열 자가 넘는 정상 본문입니다.' },
        'https://proto-live.vercel.app/support'
      )
    ).rejects.toThrow(/연결하지 못했습니다/)
  })
})

describe('extractInquiryErrorMessage', () => {
  it('joins array messages and falls back when the body is opaque', () => {
    expect(extractInquiryErrorMessage({ message: ['a', 'b'] }, 'fb')).toBe('a b')
    expect(extractInquiryErrorMessage({ message: 'single' }, 'fb')).toBe('single')
    expect(extractInquiryErrorMessage(null, 'fb')).toBe('fb')
    expect(extractInquiryErrorMessage({}, 'fb')).toBe('fb')
  })
})
