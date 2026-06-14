import { Logger } from '@nestjs/common'
import { z } from 'zod'

/**
 * 백엔드 환경변수 검증 스키마 (NON-FATAL).
 *
 * 부팅 시점에 `process.env`를 `safeParse`로 점검만 한다. 실패해도 절대
 * throw/exit 하지 않고 경고 로그만 남긴다 — 라이브 부팅을 깨뜨리지 않기 위함.
 * 실제 런타임에서 각 값을 읽는 기존 코드는 그대로 유지되며, 여기서는
 * 잘못된 설정을 조기에 가시화하는 역할만 한다.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  CORS_ORIGINS: z.string().optional(),
  PROJECT_STORE_PATH: z.string().optional(),
  COMMUNITY_STORE_PATH: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_TRUST_PROXY: z.string().optional(),
  PROTOLIVE_SESSION_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  SITE_ORIGIN: z.string().optional(),
})

export type AppEnv = z.infer<typeof envSchema>

/**
 * 프로덕션에서 절대 사용하면 안 되는, 알려진 안전하지 않은 기본값들.
 * 시크릿 값 자체는 로그에 찍지 않고 "감지됨" 사실만 경고한다.
 */
const KNOWN_UNSAFE_SECRETS = new Set([
  'dev-only-change-me-please',
  'dev-secret-change-me',
  'mypassword',
  'change-me-in-production',
  'replace-with-local-random-string',
])

const SECRET_ENV_KEYS = ['PROTOLIVE_SESSION_SECRET', 'DATABASE_URL'] as const

/**
 * 부팅 시 1회 호출. throw 하지 않는다.
 * @returns 검증 통과 여부 (정보용)
 */
export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
  logger: Pick<Logger, 'warn' | 'error'> = new Logger('EnvValidation')
): boolean {
  const result = envSchema.safeParse(env)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    logger.warn(
      `환경변수 형식 경고 (부팅은 계속됨): ${issues}. ` +
        `필요한 값은 apps/api/.env.example 를 참고하세요.`
    )
  }

  const isProduction = env.NODE_ENV === 'production'

  if (isProduction) {
    for (const key of SECRET_ENV_KEYS) {
      const value = env[key]?.trim()
      if (value && KNOWN_UNSAFE_SECRETS.has(value)) {
        logger.error(
          `🚨 보안 경고: 프로덕션 환경에서 ${key} 가 알려진 안전하지 않은 기본값으로 ` +
            `설정되어 있습니다. 즉시 강력한 임의 값으로 교체하세요.`
        )
      }
    }

    if (!env.PROTOLIVE_SESSION_SECRET?.trim()) {
      logger.error(`🚨 보안 경고: 프로덕션에서 PROTOLIVE_SESSION_SECRET 가 설정되어 있지 않습니다.`)
    }
  }

  return result.success
}
