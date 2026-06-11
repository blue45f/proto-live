import { IsString, MaxLength } from 'class-validator'

/** 운영 콘솔 회원 메모 갱신 — 빈 문자열이면 메모를 비운다. */
export class UpdateMemberNotesDto {
  @IsString({ message: '운영 메모는 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '운영 메모는 1000자 이하로 입력해주세요.' })
  notes: string
}
