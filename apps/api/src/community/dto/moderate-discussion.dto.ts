import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

const MODERATION_ACTIONS = ['hide', 'restore', 'delete'] as const
export type DiscussionModerationAction = (typeof MODERATION_ACTIONS)[number]

export class ModerateDiscussionDto {
  @IsString({ message: '처리 유형은 문자열이어야 합니다.' })
  @IsIn(MODERATION_ACTIONS, { message: '숨김, 복구, 삭제 중 하나를 선택해주세요.' })
  action: DiscussionModerationAction

  @IsOptional()
  @IsString({ message: '운영 메모는 문자열이어야 합니다.' })
  @MaxLength(300, { message: '운영 메모는 300자 이하로 입력해주세요.' })
  note?: string
}
