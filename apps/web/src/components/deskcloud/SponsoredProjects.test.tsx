import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import { getAdClient } from '../../lib/deskcloud'

import { SponsoredProjects } from './SponsoredProjects'

// AdDesk is env-gated via lib/deskcloud; mock the factory + slots to control state.
vi.mock('../../lib/deskcloud', () => ({
  getAdClient: vi.fn(),
  adSlots: ['market-spotlight-1'],
}))

// Embla needs real layout (ResizeObserver) jsdom lacks; the carousel handles a
// null api, so stub the hook to a ref + no api.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))

const mockGetAdClient = getAdClient as unknown as Mock

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SponsoredProjects', () => {
  it('renders nothing when AdDesk is off (no client)', () => {
    mockGetAdClient.mockReturnValue(null)
    const { container } = render(<SponsoredProjects />)
    expect(container.querySelector('section')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('renders a sponsored card when a slot serves a creative', async () => {
    const serve = vi.fn().mockResolvedValue({
      served: true,
      creativeId: 'c1',
      imageUrl: 'https://cdn.example.com/ad-1.png',
      linkUrl: 'https://example.com/go',
      alt: '추천 프로젝트',
      size: null,
    })
    mockGetAdClient.mockReturnValue({
      serve,
      trackImpression: vi.fn().mockResolvedValue({ ok: true, count: 1 }),
      trackClick: vi.fn().mockResolvedValue({ ok: true, count: 1 }),
    })

    const { container } = render(<SponsoredProjects />)
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull())

    const link = container.querySelector('a[rel~="sponsored"]')
    expect(link?.getAttribute('href')).toBe('https://example.com/go')
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/ad-1.png'
    )
    expect(serve).toHaveBeenCalledWith(expect.objectContaining({ slot: 'market-spotlight-1' }))
  })
})
