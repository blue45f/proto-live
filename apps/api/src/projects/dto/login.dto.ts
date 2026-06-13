import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const loginSchema = z
  .object({
    email: z
      .string({ error: '이메일 형식이 올바르지 않습니다.' })
      .min(1, '이메일을 입력해주세요.')
      .email('이메일 형식이 올바르지 않습니다.'),
    password: z
      .string({ error: '비밀번호는 문자열이어야 합니다.' })
      .min(1, '비밀번호를 입력해주세요.')
      .max(128, '비밀번호는 128자 이하로 입력해주세요.'),
  })
  .strict()

export class LoginDto extends createZodDto(loginSchema) {}
