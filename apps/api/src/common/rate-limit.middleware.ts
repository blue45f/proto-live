import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
}

interface Bucket {
  count: number
  resetAt: number
}

export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly options: RateLimiterOptions) {}

  consume(key: string, now = Date.now()) {
    const existing = this.buckets.get(key)
    const bucket =
      !existing || existing.resetAt <= now
        ? {
            count: 0,
            resetAt: now + this.options.windowMs,
          }
        : existing

    bucket.count += 1
    this.buckets.set(key, bucket)

    return {
      allowed: bucket.count <= this.options.maxRequests,
      remaining: Math.max(0, this.options.maxRequests - bucket.count),
      retryAfterMs: Math.max(0, bucket.resetAt - now),
      resetAt: bucket.resetAt,
    }
  }

  cleanup(now = Date.now()) {
    for (const [clientKey, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(clientKey)
      }
    }
  }
}

interface ClientKeySource {
  headers: Request['headers']
  ip?: string
  socket?: { remoteAddress?: string }
}

// Trust the X-Forwarded-For header only when explicitly enabled. Behind a real
// proxy (Render/Fly), set RATE_LIMIT_TRUST_PROXY=1 so rate limiting keys on the
// real client IP. Off by default so a direct caller cannot spoof XFF to mint a
// fresh bucket per request and bypass the limit.
export function isProxyTrusted(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes)$/i.test((env.RATE_LIMIT_TRUST_PROXY ?? '').trim())
}

export function resolveClientKey(request: ClientKeySource, trustProxy: boolean): string {
  if (trustProxy) {
    const forwardedFor = request.headers['x-forwarded-for']
    const fromHeader = Array.isArray(forwardedFor)
      ? forwardedFor[0]?.trim()
      : forwardedFor?.split(',')[0]?.trim()
    if (fromHeader) {
      return fromHeader
    }
  }
  return request.ip || request.socket?.remoteAddress || 'unknown'
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = new TokenBucketRateLimiter({
    windowMs: Math.max(1, Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000) || 60_000),
    maxRequests: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120) || 120),
  })

  private readonly trustProxy = isProxyTrusted()
  private lastCleanupAt = 0
  private readonly cleanupIntervalMs = 30_000

  use(request: Request, response: Response, next: NextFunction) {
    const now = Date.now()

    const clientKey = resolveClientKey(request, this.trustProxy)

    const result = this.limiter.consume(clientKey, now)
    response.setHeader('X-RateLimit-Remaining', String(result.remaining))
    response.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString())

    if (!result.allowed) {
      response.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)))
      response.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please retry after the rate limit window resets.',
      })
      return
    }

    if (now >= this.lastCleanupAt + this.cleanupIntervalMs) {
      this.lastCleanupAt = now
      this.limiter.cleanup(now)
    }

    next()
  }
}
