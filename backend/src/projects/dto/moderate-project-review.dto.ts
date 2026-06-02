import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const MODERATION_ACTIONS = ['keep', 'hide', 'restore'] as const;

export type ProjectReviewModerationAction = (typeof MODERATION_ACTIONS)[number];

export class ModerateProjectReviewDto {
  @IsEmail({}, { message: '운영자 이메일 형식이 올바르지 않습니다.' })
  @IsNotEmpty({ message: '운영자 이메일이 필요합니다.' })
  adminEmail: string;

  @IsString({ message: '처리 액션은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '처리 액션을 선택해주세요.' })
  @IsIn(MODERATION_ACTIONS, { message: '유지, 숨김, 복구 중 하나를 선택해주세요.' })
  action: ProjectReviewModerationAction;

  @IsString({ message: '운영 메모는 문자열이어야 합니다.' })
  @IsOptional()
  @MaxLength(500, { message: '운영 메모는 500자 이하로 입력해주세요.' })
  note?: string;
}
