import { BadRequestException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import type { ZodError } from 'zod'

/**
 * 전역 Zod 검증 파이프.
 * 기존 class-validator 와 동일한 응답 형태({ statusCode, message: string[], error })를 유지해
 * 프론트엔드의 getApiErrorMessage(message 문자열/배열 추출)가 그대로 동작하도록 한다.
 * nestjs-zod 의 ZodExceptionCreator 시그니처는 (error: unknown) => Error 이므로 ZodError 로 좁힌다.
 */
export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error) =>
    new BadRequestException((error as ZodError).issues.map((issue) => issue.message)),
})
