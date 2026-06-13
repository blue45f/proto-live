import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const setSeasonChallengeSchema = z
  .object({
    title: z
      .string({ error: '챌린지 제목은 문자열이어야 합니다.' })
      .max(100, '챌린지 제목은 100자 이하로 입력해주세요.')
      .optional(),
    description: z
      .string({ error: '챌린지 설명은 문자열이어야 합니다.' })
      .max(280, '챌린지 설명은 280자 이하로 입력해주세요.')
      .optional(),
    endsAt: z
      .string({ error: '챌린지 마감일은 ISO 8601 날짜 형식이어야 합니다.' })
      .refine((v) => !Number.isNaN(Date.parse(v)), {
        error: '챌린지 마감일은 ISO 8601 날짜 형식이어야 합니다.',
      })
      .optional(),
  })
  .strict()

export class SetSeasonChallengeDto extends createZodDto(setSeasonChallengeSchema) {}
