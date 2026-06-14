import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { ATTACHMENTS_PER_TARGET } from '../community.service'

function parseOptionalInteger(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  if (!/^-?\d+$/.test(normalized)) return value
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : value
}

export const createDiscussionCommentSchema = z
  .object({
    body: z
      .string({ error: '댓글은 문자열이어야 합니다.' })
      .min(2, '댓글은 2자 이상 입력해주세요.')
      .max(1000, '댓글은 1000자 이하로 입력해주세요.'),
    parentId: z.preprocess(
      parseOptionalInteger,
      z
        .number({ error: '답글 대상이 올바르지 않습니다.' })
        .int('답글 대상이 올바르지 않습니다.')
        .min(1, '답글 대상이 올바르지 않습니다.')
        .optional()
    ),
    attachments: z
      .array(z.string({ error: '첨부는 이미지 data URL 문자열이어야 합니다.' }), {
        error: '첨부 형식이 올바르지 않습니다.',
      })
      .max(
        ATTACHMENTS_PER_TARGET,
        `이미지는 최대 ${ATTACHMENTS_PER_TARGET}장까지 첨부할 수 있습니다.`
      )
      .optional(),
  })
  .strict()

export class CreateDiscussionCommentDto extends createZodDto(createDiscussionCommentSchema) {}
