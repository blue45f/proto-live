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

describe('matchRoute: project discussion split routes', () => {
  it('resolves /projects/:id/discussions to the hub list under the market view', () => {
    setPath('/projects/7/discussions')
    const route = matchRoute()
    expect(route.view).toBe('market')
    expect(route.projectId).toBe(7)
    expect(route.discussion).toEqual({ mode: 'list' })
  })

  it('resolves /projects/:id/discussions/new to the composer route', () => {
    setPath('/projects/7/discussions/new')
    expect(matchRoute().discussion).toEqual({ mode: 'new' })
  })

  it('resolves /projects/:id/discussions/:discussionId to the thread detail', () => {
    setPath('/projects/7/discussions/31')
    const route = matchRoute()
    expect(route.projectId).toBe(7)
    expect(route.discussion).toEqual({ mode: 'detail', discussionId: 31 })
  })

  it('keeps the plain project detail free of a discussion sub-route', () => {
    setPath('/projects/7')
    expect(matchRoute().discussion).toBeNull()
  })
})

describe('matchRoute: messages / support / admin split routes', () => {
  it('resolves /messages and /messages/:id to the inbox view', () => {
    setPath('/messages')
    expect(matchRoute().view).toBe('messages')
    expect(matchRoute().conversationId).toBeNull()

    setPath('/messages/12')
    const route = matchRoute()
    expect(route.view).toBe('messages')
    expect(route.conversationId).toBe(12)
  })

  it('resolves /support to the in-app inquiry view', () => {
    setPath('/support')
    expect(matchRoute().view).toBe('support')
  })

  it('resolves the admin split routes ahead of the /admin alias', () => {
    setPath('/admin/community')
    expect(matchRoute().view).toBe('adminCommunity')

    setPath('/admin/members')
    expect(matchRoute().view).toBe('adminMembers')

    setPath('/admin')
    expect(matchRoute().view).toBe('admin')
  })
})

describe('routePath: community/support builders', () => {
  it('builds the discussion hub, composer, detail, messages, and support paths', () => {
    expect(routePath.discussions(7)).toBe('/projects/7/discussions')
    expect(routePath.discussionNew(7)).toBe('/projects/7/discussions/new')
    expect(routePath.discussion(7, 31)).toBe('/projects/7/discussions/31')
    expect(routePath.messages()).toBe('/messages')
    expect(routePath.conversation(12)).toBe('/messages/12')
    expect(routePath.support()).toBe('/support')
    expect(routePath.adminCommunity()).toBe('/admin/community')
    expect(routePath.adminMembers()).toBe('/admin/members')
  })
})
