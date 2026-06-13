import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const markNotificationsReadSchema = z
  .object({
    // 미지정 시 전체 읽음 처리. 지정 시 해당 알림 id만.
    ids: z
      .array(z.number({ error: '알림 식별자가 올바르지 않습니다.' }).int(), {
        error: '알림 식별자 목록이 올바르지 않습니다.',
      })
      .max(500)
      .optional(),
  })
  .strict()

export class MarkNotificationsReadDto extends createZodDto(markNotificationsReadSchema) {}
