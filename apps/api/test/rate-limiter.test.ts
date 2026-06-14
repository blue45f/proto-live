import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  TokenBucketRateLimiter,
  isProxyTrusted,
  resolveClientKey,
} from '../src/common/rate-limit.middleware'

test('TokenBucketRateLimiter allows requests up to the configured limit', () => {
  const limiter = new TokenBucketRateLimiter({ windowMs: 1000, maxRequests: 2 })

  assert.equal(limiter.consume('client-a', 0).allowed, true)
  assert.equal(limiter.consume('client-a', 100).allowed, true)
  assert.equal(limiter.consume('client-a', 200).allowed, false)
})

test('TokenBucketRateLimiter resets after the configured window', () => {
  const limiter = new TokenBucketRateLimiter({ windowMs: 1000, maxRequests: 1 })

  assert.equal(limiter.consume('client-a', 0).allowed, true)
  assert.equal(limiter.consume('client-a', 999).allowed, false)
  assert.equal(limiter.consume('client-a', 1000).allowed, true)
})

test('TokenBucketRateLimiter isolates clients', () => {
  const limiter = new TokenBucketRateLimiter({ windowMs: 1000, maxRequests: 1 })

  assert.equal(limiter.consume('client-a', 0).allowed, true)
  assert.equal(limiter.consume('client-b', 0).allowed, true)
  assert.equal(limiter.consume('client-a', 10).allowed, false)
})

test('isProxyTrusted only enables on explicit opt-in values', () => {
  assert.equal(isProxyTrusted({}), false)
  assert.equal(isProxyTrusted({ RATE_LIMIT_TRUST_PROXY: '0' }), false)
  assert.equal(isProxyTrusted({ RATE_LIMIT_TRUST_PROXY: 'false' }), false)
  assert.equal(isProxyTrusted({ RATE_LIMIT_TRUST_PROXY: '1' }), true)
  assert.equal(isProxyTrusted({ RATE_LIMIT_TRUST_PROXY: 'true' }), true)
})

test('resolveClientKey ignores spoofable X-Forwarded-For when proxy is untrusted', () => {
  const request = {
    headers: { 'x-forwarded-for': '9.9.9.9' },
    ip: '10.0.0.1',
    socket: { remoteAddress: '10.0.0.2' },
  }
  // Untrusted: a direct caller cannot spoof XFF to mint a fresh bucket.
  assert.equal(resolveClientKey(request, false), '10.0.0.1')
  // Trusted (behind a real proxy): the real client IP from XFF is used.
  assert.equal(resolveClientKey(request, true), '9.9.9.9')
})

test('resolveClientKey falls back through ip then socket then unknown', () => {
  assert.equal(resolveClientKey({ headers: {}, ip: '10.0.0.1' }, false), '10.0.0.1')
  assert.equal(
    resolveClientKey({ headers: {}, socket: { remoteAddress: '10.0.0.2' } }, false),
    '10.0.0.2'
  )
  assert.equal(resolveClientKey({ headers: {} }, true), 'unknown')
})
