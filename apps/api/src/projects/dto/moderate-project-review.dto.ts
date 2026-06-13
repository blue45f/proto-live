import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const MODERATION_ACTIONS = ['keep', 'hide', 'restore'] as const
export type ProjectReviewModerationAction = (typeof MODERATION_ACTIONS)[number]

export const moderateProjectReviewSchema = z
  .object({
    action: z.enum(MODERATION_ACTIONS, { error: '유지, 숨김, 복구 중 하나를 선택해주세요.' }),
    note: z
      .string({ error: '운영 메모는 문자열이어야 합니다.' })
      .max(500, '운영 메모는 500자 이하로 입력해주세요.')
      .optional(),
  })
  .strict()

export class ModerateProjectReviewDto extends createZodDto(moderateProjectReviewSchema) {}
