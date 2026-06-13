import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const updateForbiddenTermSchema = z
  .object({
    term: z
      .string({ error: '금칙어는 문자열이어야 합니다.' })
      .min(1, '금칙어를 입력해주세요.')
      .max(40, '금칙어는 40자 이하로 입력해주세요.')
      .optional(),
    scope: z
      .enum(['all', 'discussion', 'message'], { error: '금칙어 적용 범위가 올바르지 않습니다.' })
      .optional(),
    reason: z
      .string({ error: '운영 사유는 문자열이어야 합니다.' })
      .max(300, '운영 사유는 300자 이하로 입력해주세요.')
      .optional(),
    enabled: z.boolean({ error: '활성 여부가 올바르지 않습니다.' }).optional(),
  })
  .strict()

export class UpdateForbiddenTermDto extends createZodDto(updateForbiddenTermSchema) {}
