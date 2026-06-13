import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const MODERATION_ACTIONS = ['hide', 'restore', 'delete'] as const
export type DiscussionModerationAction = (typeof MODERATION_ACTIONS)[number]

export const moderateDiscussionSchema = z
  .object({
    action: z.enum(MODERATION_ACTIONS, { error: '숨김, 복구, 삭제 중 하나를 선택해주세요.' }),
    note: z
      .string({ error: '운영 메모는 문자열이어야 합니다.' })
      .max(300, '운영 메모는 300자 이하로 입력해주세요.')
      .optional(),
  })
  .strict()

export class ModerateDiscussionDto extends createZodDto(moderateDiscussionSchema) {}
