import { IsBoolean } from 'class-validator'

export class SetProjectFeaturedDto {
  @IsBoolean({ message: '투자 검토 대상 여부는 true 또는 false 입니다.' })
  featured: boolean
}
