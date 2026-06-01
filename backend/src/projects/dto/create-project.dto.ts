import {
  IsEmail,
  Equals,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { PROJECT_ACCESS_MODES, PROJECT_CATEGORIES, ProjectAccessMode, ProjectCategory } from '../project.constants';

/**
 * 프로젝트 생성 요청 DTO
 * class-validator 데코레이터를 사용하여 입력 유효성 검사를 수행합니다.
 */
export class CreateProjectDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수 항목입니다.' })
  email: string;

  @IsString({ message: '프로젝트 제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '프로젝트 제목은 필수 항목입니다.' })
  @MaxLength(100, { message: '프로젝트 제목은 100자 이하로 입력해주세요.' })
  title: string;

  @IsString({ message: '프로젝트 설명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '프로젝트 설명은 필수 항목입니다.' })
  @MaxLength(1000, { message: '프로젝트 설명은 1000자 이하로 입력해주세요.' })
  description: string;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Live URL은 http:// 또는 https://로 시작하는 유효한 URL이어야 합니다.' },
  )
  @IsNotEmpty({ message: 'Live URL은 필수 항목입니다.' })
  liveUrl: string;

  @IsString({ message: '카테고리는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '카테고리는 필수 항목입니다.' })
  @IsIn(PROJECT_CATEGORIES, { message: '유효한 카테고리를 선택해주세요.' })
  category: ProjectCategory;

  @IsString({ message: '공개 범위는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '공개 범위를 선택해주세요.' })
  @IsIn(
    PROJECT_ACCESS_MODES.map((mode) => mode.id),
    { message: '유효한 공개 범위를 선택해주세요.' },
  )
  accessMode: ProjectAccessMode;

  @Equals(true, {
    message: '상용화 전 서비스 노출 위험과 제출 권한 안내를 확인해야 등록할 수 있습니다.',
  })
  protectionNoticeAccepted: boolean;

  @IsOptional()
  @IsString({ message: '썸네일은 문자열이어야 합니다.' })
  thumbnail?: string;
}
