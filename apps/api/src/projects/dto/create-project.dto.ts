import {
  IsEmail,
  IsArray,
  IsBoolean,
  Equals,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator'

import {
  BUILD_TOOLS,
  MAX_BUILD_TOOLS,
  MAX_CUSTOM_TOOLS,
  PROJECT_ACCESS_MODES,
  PROJECT_CATEGORIES,
  PROJECT_MATURITIES,
  PROJECT_STACKS,
  ProjectAccessMode,
  ProjectCategory,
  ProjectMaturity,
  ProjectStack,
} from '../project.constants'

/**
 * 프로젝트 생성 요청 DTO
 * class-validator 데코레이터를 사용하여 입력 유효성 검사를 수행합니다.
 */
export class CreateProjectDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수 항목입니다.' })
  email: string

  @IsString({ message: '프로젝트 제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '프로젝트 제목은 필수 항목입니다.' })
  @MaxLength(100, { message: '프로젝트 제목은 100자 이하로 입력해주세요.' })
  title: string

  @IsString({ message: '프로젝트 설명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '프로젝트 설명은 필수 항목입니다.' })
  @MaxLength(1000, { message: '프로젝트 설명은 1000자 이하로 입력해주세요.' })
  description: string

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Live URL은 http:// 또는 https://로 시작하는 유효한 URL이어야 합니다.' }
  )
  @IsNotEmpty({ message: 'Live URL은 필수 항목입니다.' })
  liveUrl: string

  @IsString({ message: '카테고리는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '카테고리는 필수 항목입니다.' })
  @IsIn(PROJECT_CATEGORIES, { message: '유효한 카테고리를 선택해주세요.' })
  category: ProjectCategory

  @IsOptional()
  @IsString({ message: '진행 단계는 문자열이어야 합니다.' })
  @IsIn(PROJECT_MATURITIES.map((maturity) => maturity.id), {
    message: '유효한 진행 단계를 선택해주세요.',
  })
  maturity?: ProjectMaturity

  @IsOptional()
  @IsString({ message: '빌드 유형은 문자열이어야 합니다.' })
  @IsIn(PROJECT_STACKS.map((stack) => stack.id), { message: '유효한 빌드 유형을 선택해주세요.' })
  stack?: ProjectStack

  @IsString({ message: '공개 범위는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '공개 범위를 선택해주세요.' })
  @IsIn(PROJECT_ACCESS_MODES.map((mode) => mode.id), {
    message: '유효한 공개 범위를 선택해주세요.',
  })
  accessMode: ProjectAccessMode

  @Equals(true, {
    message: '상용화 전 서비스 노출 위험과 제출 권한 안내를 확인해야 등록할 수 있습니다.',
  })
  protectionNoticeAccepted: boolean

  @IsOptional()
  @IsString({ message: '썸네일은 문자열이어야 합니다.' })
  thumbnail?: string

  @IsOptional()
  @IsArray({ message: '태그는 배열이어야 합니다.' })
  @ArrayMaxSize(8, { message: '태그는 최대 8개까지 입력할 수 있습니다.' })
  @ArrayUnique({ message: '중복 태그는 제거해주세요.' })
  @IsString({ each: true, message: '태그는 문자열이어야 합니다.' })
  @MaxLength(24, { each: true, message: '태그는 24자 이하로 입력해주세요.' })
  tags?: string[]

  @IsOptional()
  @IsArray({ message: '제작 도구는 배열이어야 합니다.' })
  @ArrayMaxSize(MAX_BUILD_TOOLS, {
    message: `제작 도구는 최대 ${MAX_BUILD_TOOLS}개까지 선택할 수 있습니다.`,
  })
  @ArrayUnique({ message: '중복 도구는 제거해주세요.' })
  @IsIn(BUILD_TOOLS.map((tool) => tool.id), {
    each: true,
    message: '지원하지 않는 제작 도구입니다.',
  })
  builtWith?: string[]

  @IsOptional()
  @IsArray({ message: '직접 입력 도구는 배열이어야 합니다.' })
  @ArrayMaxSize(MAX_CUSTOM_TOOLS, {
    message: `직접 입력 도구는 최대 ${MAX_CUSTOM_TOOLS}개까지 입력할 수 있습니다.`,
  })
  @ArrayUnique({ message: '중복 도구는 제거해주세요.' })
  @IsString({ each: true, message: '도구 이름은 문자열이어야 합니다.' })
  @MaxLength(24, { each: true, message: '도구 이름은 24자 이하로 입력해주세요.' })
  customTools?: string[]

  @IsOptional()
  @IsBoolean({ message: '바이브코딩 여부는 true 또는 false 입니다.' })
  vibeCoded?: boolean
}
