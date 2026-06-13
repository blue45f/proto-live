import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ProjectEventType } from '../project.models'

const PROJECT_EVENT_TYPES = [
  'preview',
  'outbound',
  'refresh',
] as const satisfies readonly ProjectEventType[]

export const recordProjectEventSchema = z
  .object({
    type: z.enum(PROJECT_EVENT_TYPES, { error: '기록 가능한 이벤트 타입을 선택해주세요.' }),
  })
  .strict()

export class RecordProjectEventDto extends createZodDto(recordProjectEventSchema) {}
