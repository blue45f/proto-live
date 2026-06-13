import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import type { ForbiddenTermScope } from '../community.models'

export class CreateForbiddenTermDto {
  @IsString({ message: '금칙어는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '금칙어를 입력해주세요.' })
  @MinLength(1, { message: '금칙어를 입력해주세요.' })
  @MaxLength(40, { message: '금칙어는 40자 이하로 입력해주세요.' })
  term: string

  @IsOptional()
  @IsString({ message: '적용 범위는 문자열이어야 합니다.' })
  @IsIn(['all', 'discussion', 'message'], {
    message: '금칙어 적용 범위가 올바르지 않습니다.',
  })
  scope?: ForbiddenTermScope

  @IsOptional()
  @IsString({ message: '운영 사유는 문자열이어야 합니다.' })
  @MaxLength(300, { message: '운영 사유는 300자 이하로 입력해주세요.' })
  reason?: string
}
