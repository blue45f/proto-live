import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PolicyView } from './PolicyView'
import type { PublicPolicy } from '../../lib/termsdesk'
import { publicPrivacyPolicy, publicTermsPolicy } from '../../test/fixtures'

function okResponse(policy: PublicPolicy) {
  return { ok: true, json: async () => policy }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PolicyView', () => {
  it('shows a loading skeleton, then renders the published document', async () => {
    const fetchMock = vi.fn(async () => okResponse(publicTermsPolicy))
    vi.stubGlobal('fetch', fetchMock)

    render(<PolicyView view="terms" />)

    expect(screen.getByRole('status', { name: '문서를 불러오는 중' })).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { name: '제1조 (목적)', level: 3 })
    ).toBeInTheDocument()
    expect(screen.getByText('이 약관은 ProtoLive 이용 조건을 정합니다.')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('계정 정보')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://termsdesk.vercel.app/api/public/proto-live/policies/terms-of-service',
      expect.anything()
    )
  })

  it('surfaces version, shortened content hash and effective date as the trust footer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse(publicTermsPolicy))
    )

    render(<PolicyView view="terms" />)

    expect(await screen.findByText('v1')).toBeInTheDocument()
    expect(screen.getByText('12b390fde0d4')).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    const sourceLink = screen.getByRole('link', { name: /원문·이력 보기/ })
    expect(sourceLink).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/proto-live/terms-of-service'
    )
  })

  it('requests the privacy slug when rendering the privacy view', async () => {
    const fetchMock = vi.fn(async () => okResponse(publicPrivacyPolicy))
    vi.stubGlobal('fetch', fetchMock)

    render(<PolicyView view="privacy" />)
    await screen.findByRole('heading', { name: '제1조 (목적)', level: 3 })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://termsdesk.vercel.app/api/public/proto-live/policies/privacy-policy',
      expect.anything()
    )
    expect(screen.getByRole('heading', { name: '개인정보처리방침', level: 2 })).toBeInTheDocument()
  })

  it('falls back to an external TermsDesk link card on load failure and can retry', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(okResponse(publicTermsPolicy))
    vi.stubGlobal('fetch', fetchMock)

    render(<PolicyView view="terms" />)

    expect(await screen.findByText('문서를 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /TermsDesk에서 원문 보기/ })).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/proto-live/terms-of-service'
    )

    await userEvent.click(screen.getByRole('button', { name: /다시 불러오기/ }))

    expect(
      await screen.findByRole('heading', { name: '제1조 (목적)', level: 3 })
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
