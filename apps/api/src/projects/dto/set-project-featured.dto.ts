import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const setProjectFeaturedSchema = z
  .object({
    featured: z.boolean({ error: '투자 검토 대상 여부는 true 또는 false 입니다.' }),
  })
  .strict()

export class SetProjectFeaturedDto extends createZodDto(setProjectFeaturedSchema) {}
