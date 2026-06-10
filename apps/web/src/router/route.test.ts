import { afterEach, describe, expect, it } from 'vitest'
import { matchRoute, routePath } from './route'

function setPath(path: string) {
  window.history.pushState({}, '', path)
}

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('matchRoute: legal policy routes', () => {
  it('resolves /terms to the terms view (trailing slash tolerated)', () => {
    setPath('/terms')
    expect(matchRoute().view).toBe('terms')

    setPath('/terms/')
    expect(matchRoute().view).toBe('terms')
  })

  it('resolves /privacy to the privacy view', () => {
    setPath('/privacy')
    expect(matchRoute().view).toBe('privacy')
  })

  it('keeps policy routes free of detail/maker/submit intents', () => {
    setPath('/privacy')
    const route = matchRoute()
    expect(route.projectId).toBeNull()
    expect(route.makerId).toBeNull()
    expect(route.intent).toBeNull()
  })

  it('still falls back to market for unknown paths', () => {
    setPath('/terms-of-service')
    expect(matchRoute().view).toBe('market')
  })
})

describe('routePath.policy', () => {
  it('builds the internal policy paths used by the footer links', () => {
    expect(routePath.policy('terms')).toBe('/terms')
    expect(routePath.policy('privacy')).toBe('/privacy')
  })
})
