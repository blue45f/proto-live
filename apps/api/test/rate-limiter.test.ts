import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { TokenBucketRateLimiter } from '../src/common/rate-limit.middleware'

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
