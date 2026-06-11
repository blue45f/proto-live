import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { ATTACHMENTS_PER_TARGET } from '../community.service'

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

export class CreateDiscussionCommentDto {
  @IsString({ message: '댓글은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MinLength(2, { message: '댓글은 2자 이상 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하로 입력해주세요.' })
  body: string

  /** 1단 답글 대상(루트 댓글 id). 답글의 답글은 서비스에서 거부한다. */
  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: '답글 대상이 올바르지 않습니다.' })
  @Min(1, { message: '답글 대상이 올바르지 않습니다.' })
  parentId?: number

  @IsOptional()
  @IsArray({ message: '첨부 형식이 올바르지 않습니다.' })
  @ArrayMaxSize(ATTACHMENTS_PER_TARGET, {
    message: `이미지는 최대 ${ATTACHMENTS_PER_TARGET}장까지 첨부할 수 있습니다.`,
  })
  @IsString({ each: true, message: '첨부는 이미지 data URL 문자열이어야 합니다.' })
  attachments?: string[]
}
