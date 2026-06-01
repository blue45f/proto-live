import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ProjectReviewAuthorRole,
  ProjectReviewType,
} from '../project.models';

const REVIEW_TYPES: ProjectReviewType[] = ['review', 'support', 'idea'];
const AUTHOR_ROLES: ProjectReviewAuthorRole[] = ['maker', 'investor', 'member'];

function parseOptionalInteger(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : value;
}

export class CreateProjectReviewDto {
  @IsEmail({}, { message: '로그인 이메일 형식이 올바르지 않습니다.' })
  @IsNotEmpty({ message: '로그인 이메일이 필요합니다.' })
  email: string;

  @IsString({ message: '회원 역할은 문자열이어야 합니다.' })
  @IsOptional()
  @IsIn(AUTHOR_ROLES, { message: '회원 역할이 올바르지 않습니다.' })
  role?: ProjectReviewAuthorRole;

  @IsString({ message: '의견 종류는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '의견 종류를 선택해주세요.' })
  @IsIn(REVIEW_TYPES, { message: '리뷰, 성장 도움, 아이디어 중 하나를 선택해주세요.' })
  type: ProjectReviewType;

  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: '평점은 정수여야 합니다.' })
  @Min(1, { message: '평점은 1점 이상이어야 합니다.' })
  @Max(5, { message: '평점은 5점 이하여야 합니다.' })
  rating?: number;

  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: '답글 대상이 올바르지 않습니다.' })
  @Min(1, { message: '답글 대상이 올바르지 않습니다.' })
  parentId?: number;

  @IsString({ message: '의견은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '의견을 입력해주세요.' })
  @MaxLength(700, { message: '의견은 700자 이하로 입력해주세요.' })
  body: string;
}
