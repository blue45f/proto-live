import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export type AdminMemberLifecycleAction = 'suspend' | 'restore' | 'withdraw'

/** 운영 콘솔 회원 라이프사이클 처리 — 정지/복구/탈퇴 처리. */
export const updateMemberLifecycleSchema = z
  .object({
    action: z.enum(['suspend', 'restore', 'withdraw'], {
      error: '회원 처리 액션이 올바르지 않습니다.',
    }),
    reason: z
      .string({ error: '처리 사유는 문자열이어야 합니다.' })
      .max(500, '처리 사유는 500자 이하로 입력해주세요.')
      .optional(),
  })
  .strict()

export class UpdateMemberLifecycleDto extends createZodDto(updateMemberLifecycleSchema) {}
