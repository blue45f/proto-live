import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createProjectLogSchema = z
  .object({
    body: z
      .string({ error: '메이커로그 내용은 문자열이어야 합니다.' })
      .min(1, '메이커로그 내용은 필수 항목입니다.')
      .max(700, '메이커로그는 700자 이하로 입력해주세요.'),
  })
  .strict()

export class CreateProjectLogDto extends createZodDto(createProjectLogSchema) {}
