import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { DISCUSSION_CATEGORIES, DiscussionCategory } from '../community.models'
import { ATTACHMENTS_PER_TARGET } from '../community.service'

export class CreateDiscussionDto {
  @IsString({ message: '토론 주제 분류는 문자열이어야 합니다.' })
  @IsIn(DISCUSSION_CATEGORIES, { message: '질문, 피드백, 도움 요청, 자랑 중에서 선택해주세요.' })
  category: DiscussionCategory

  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '토론 제목을 입력해주세요.' })
  @MinLength(2, { message: '제목은 2자 이상 입력해주세요.' })
  @MaxLength(120, { message: '제목은 120자 이하로 입력해주세요.' })
  title: string

  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '토론 내용을 입력해주세요.' })
  @MinLength(10, { message: '내용은 10자 이상 입력해주세요.' })
  @MaxLength(4000, { message: '내용은 4000자 이하로 입력해주세요.' })
  body: string

  /** 클라이언트가 1600px/2MB 캡으로 만든 이미지 data URL 목록(서버가 형식·크기 재검증). */
  @IsOptional()
  @IsArray({ message: '첨부 형식이 올바르지 않습니다.' })
  @ArrayMaxSize(ATTACHMENTS_PER_TARGET, {
    message: `이미지는 최대 ${ATTACHMENTS_PER_TARGET}장까지 첨부할 수 있습니다.`,
  })
  @IsString({ each: true, message: '첨부는 이미지 data URL 문자열이어야 합니다.' })
  attachments?: string[]
}
