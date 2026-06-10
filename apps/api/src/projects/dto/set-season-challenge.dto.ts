import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator'

export class SetSeasonChallengeDto {
  @IsOptional()
  @IsString({ message: '챌린지 제목은 문자열이어야 합니다.' })
  @MaxLength(100, { message: '챌린지 제목은 100자 이하로 입력해주세요.' })
  title?: string

  @IsOptional()
  @IsString({ message: '챌린지 설명은 문자열이어야 합니다.' })
  @MaxLength(280, { message: '챌린지 설명은 280자 이하로 입력해주세요.' })
  description?: string

  @IsOptional()
  @IsDateString({}, { message: '챌린지 마감일은 ISO 8601 날짜 형식이어야 합니다.' })
  endsAt?: string
}
