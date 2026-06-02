import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @MaxLength(128, { message: '비밀번호는 128자 이하로 입력해주세요.' })
  password: string;
}
