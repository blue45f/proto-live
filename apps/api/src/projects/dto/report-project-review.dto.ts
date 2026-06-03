import { IsOptional, IsString, MaxLength } from 'class-validator'

export class ReportProjectReviewDto {
  @IsString({ message: '신고 사유는 문자열이어야 합니다.' })
  @IsOptional()
  @MaxLength(300, { message: '신고 사유는 300자 이하로 입력해주세요.' })
  reason?: string
}
