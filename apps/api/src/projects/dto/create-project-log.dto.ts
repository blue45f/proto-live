import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateProjectLogDto {
  @IsString({ message: '메이커로그 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '메이커로그 내용은 필수 항목입니다.' })
  @MaxLength(700, { message: '메이커로그는 700자 이하로 입력해주세요.' })
  body: string
}
