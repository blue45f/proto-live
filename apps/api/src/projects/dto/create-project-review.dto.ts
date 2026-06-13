import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ProjectReviewType } from '../project.models'

const REVIEW_TYPES = ['review', 'support', 'idea'] as const satisfies readonly ProjectReviewType[]

function parseOptionalInteger(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  if (!/^-?\d+$/.test(normalized)) return value
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : value
}

export const createProjectReviewSchema = z
  .object({
    type: z.enum(REVIEW_TYPES, { error: '리뷰, 성장 도움, 아이디어 중 하나를 선택해주세요.' }),
    rating: z.preprocess(
      parseOptionalInteger,
      z
        .number({ error: '평점은 정수여야 합니다.' })
        .int('평점은 정수여야 합니다.')
        .min(1, '평점은 1점 이상이어야 합니다.')
        .max(5, '평점은 5점 이하여야 합니다.')
        .optional()
    ),
    parentId: z.preprocess(
      parseOptionalInteger,
      z
        .number({ error: '답글 대상이 올바르지 않습니다.' })
        .int('답글 대상이 올바르지 않습니다.')
        .min(1, '답글 대상이 올바르지 않습니다.')
        .optional()
    ),
    body: z
      .string({ error: '의견은 문자열이어야 합니다.' })
      .min(1, '의견을 입력해주세요.')
      .max(700, '의견은 700자 이하로 입력해주세요.'),
  })
  .strict()

export class CreateProjectReviewDto extends createZodDto(createProjectReviewSchema) {}
