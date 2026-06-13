import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

function parseOptionalInteger(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  if (!/^-?\d+$/.test(normalized)) return value
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : value
}

/** projectId(새 대화 시작) 또는 conversationId(기존 대화 답장) 중 하나가 필요하다. */
export const sendMessageSchema = z
  .object({
    projectId: z.preprocess(
      parseOptionalInteger,
      z
        .number({ error: '프로젝트 식별자가 올바르지 않습니다.' })
        .int('프로젝트 식별자가 올바르지 않습니다.')
        .min(1, '프로젝트 식별자가 올바르지 않습니다.')
        .optional()
    ),
    conversationId: z.preprocess(
      parseOptionalInteger,
      z
        .number({ error: '대화 식별자가 올바르지 않습니다.' })
        .int('대화 식별자가 올바르지 않습니다.')
        .min(1, '대화 식별자가 올바르지 않습니다.')
        .optional()
    ),
    body: z
      .string({ error: '쪽지 내용은 문자열이어야 합니다.' })
      .min(2, '쪽지는 2자 이상 입력해주세요.')
      .max(2000, '쪽지는 2000자 이하로 입력해주세요.'),
  })
  .strict()

export class SendMessageDto extends createZodDto(sendMessageSchema) {}
