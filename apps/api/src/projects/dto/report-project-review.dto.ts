import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const reportProjectReviewSchema = z
  .object({
    reason: z
      .string({ error: '신고 사유는 문자열이어야 합니다.' })
      .max(300, '신고 사유는 300자 이하로 입력해주세요.')
      .optional(),
  })
  .strict()

export class ReportProjectReviewDto extends createZodDto(reportProjectReviewSchema) {}
