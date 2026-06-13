import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

function parseOptionalInteger(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof value !== 'string') {
    return value
  }
  const normalized = value.trim()
  if (!/^-?\d+$/.test(normalized)) {
    return value
  }
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : value
}

/** projectId(새 대화 시작) 또는 conversationId(기존 대화 답장) 중 하나가 필요하다. */
export class SendMessageDto {
  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: '프로젝트 식별자가 올바르지 않습니다.' })
  @Min(1, { message: '프로젝트 식별자가 올바르지 않습니다.' })
  projectId?: number

  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: '대화 식별자가 올바르지 않습니다.' })
  @Min(1, { message: '대화 식별자가 올바르지 않습니다.' })
  conversationId?: number

  @IsString({ message: '쪽지 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '쪽지 내용을 입력해주세요.' })
  @MinLength(2, { message: '쪽지는 2자 이상 입력해주세요.' })
  @MaxLength(2000, { message: '쪽지는 2000자 이하로 입력해주세요.' })
  body: string
}
