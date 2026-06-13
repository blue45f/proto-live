import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const updateMemberNotesSchema = z
  .object({
    notes: z
      .string({ error: '운영 메모는 문자열이어야 합니다.' })
      .max(1000, '운영 메모는 1000자 이하로 입력해주세요.'),
  })
  .strict()

export class UpdateMemberNotesDto extends createZodDto(updateMemberNotesSchema) {}
