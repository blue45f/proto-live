import { IsNotEmpty, IsUrl } from 'class-validator';

/**
 * URL 검증 요청 DTO
 * 프로젝트 제출 전 URL 유효성을 사전 검증하기 위한 DTO입니다.
 */
export class ValidateUrlDto {
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL은 http:// 또는 https://로 시작하는 유효한 형식이어야 합니다.' },
  )
  @IsNotEmpty({ message: 'URL은 필수 항목입니다.' })
  url: string;
}
