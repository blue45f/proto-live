import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export type AdminMemberLifecycleAction = 'suspend' | 'restore' | 'withdraw'

/** 운영 콘솔 회원 라이프사이클 처리 — 정지/복구/탈퇴 처리. */
export class UpdateMemberLifecycleDto {
  @IsString({ message: '회원 처리 액션은 문자열이어야 합니다.' })
  @IsIn(['suspend', 'restore', 'withdraw'], {
    message: '회원 처리 액션이 올바르지 않습니다.',
  })
  action: AdminMemberLifecycleAction

  @IsOptional()
  @IsString({ message: '처리 사유는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '처리 사유는 500자 이하로 입력해주세요.' })
  reason?: string
}
