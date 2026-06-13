import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const validateUrlSchema = z
  .object({
    url: z
      .string({ error: 'URL은 필수 항목입니다.' })
      .min(1, 'URL은 필수 항목입니다.')
      .refine(isHttpUrl, {
        error: 'URL은 http:// 또는 https://로 시작하는 유효한 형식이어야 합니다.',
      }),
  })
  .strict()

export class ValidateUrlDto extends createZodDto(validateUrlSchema) {}
