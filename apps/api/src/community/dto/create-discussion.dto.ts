import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { DISCUSSION_CATEGORIES, DiscussionCategory } from '../community.models'
import { ATTACHMENTS_PER_TARGET } from '../community.service'

export const createDiscussionSchema = z
  .object({
    category: z.enum(DISCUSSION_CATEGORIES as [DiscussionCategory, ...DiscussionCategory[]], {
      error: '질문, 피드백, 도움 요청, 자랑 중에서 선택해주세요.',
    }),
    title: z
      .string({ error: '제목은 문자열이어야 합니다.' })
      .min(2, '제목은 2자 이상 입력해주세요.')
      .max(120, '제목은 120자 이하로 입력해주세요.'),
    body: z
      .string({ error: '내용은 문자열이어야 합니다.' })
      .min(10, '내용은 10자 이상 입력해주세요.')
      .max(4000, '내용은 4000자 이하로 입력해주세요.'),
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

export class CreateDiscussionDto extends createZodDto(createDiscussionSchema) {}
