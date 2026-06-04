import { Transform } from 'class-transformer'
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import {
  ProjectAccessMode,
  ProjectCategory,
  ProjectMaturity,
  PROJECT_CATEGORIES,
  PROJECT_MATURITIES,
} from '../project.constants'

export type ProjectSortKey = 'signal' | 'recent' | 'created' | 'funding'

export interface ProjectQueryInput {
  category?: string
  maturity?: ProjectMaturity
  accessMode?: ProjectAccessMode
  q?: string
  tag?: string
  onlyVerified?: boolean
  minSignal?: number
  minFundingAmount?: number
  maxFundingAmount?: number
  sort?: ProjectSortKey
  page?: number
  limit?: number
}

function parseNumberIfPossible(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const next = Number.parseFloat(value)
  return Number.isFinite(next) ? next : value
}

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseBooleanString(value: unknown): unknown {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return value
  return value.trim().toLowerCase()
}

export class GetProjectsQueryDto {
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  q?: string

  @Transform(({ value }) => trimOrUndefined(value))
  @IsIn(PROJECT_CATEGORIES as readonly string[], { message: '카테고리가 유효하지 않습니다.' })
  @IsOptional()
  category?: ProjectCategory

  @Transform(({ value }) => trimOrUndefined(value))
  @IsIn(PROJECT_MATURITIES.map((maturity) => maturity.id), {
    message: '진행 단계가 유효하지 않습니다.',
  })
  @IsOptional()
  maturity?: ProjectMaturity

  @Transform(({ value }) => trimOrUndefined(value))
  @IsIn(['screened', 'open'], { message: '공개 범위가 유효하지 않습니다.' })
  @IsOptional()
  accessMode?: ProjectAccessMode

  @Transform(({ value }) => trimOrUndefined(value))
  @IsString({ message: '태그는 문자열이어야 합니다.' })
  @MaxLength(24, { message: '태그는 24자 이하로 입력해주세요.' })
  @IsOptional()
  tag?: string

  @Transform(({ value }) => trimOrUndefined(value))
  @IsIn(['signal', 'recent', 'created', 'funding'], { message: '정렬 옵션이 유효하지 않습니다.' })
  @IsOptional()
  sort?: ProjectSortKey

  @Transform(({ value }) => parseNumberIfPossible(value))
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: '최소 시그널은 정수여야 합니다.' }
  )
  @IsInt({ message: '최소 시그널은 정수여야 합니다.' })
  @Min(0, { message: '최소 시그널은 0 이상이어야 합니다.' })
  @Max(1000, { message: '최소 시그널은 1000 이하이어야 합니다.' })
  @IsOptional()
  minSignal?: number

  @Transform(({ value }) => parseNumberIfPossible(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0, { message: '최소 투자액은 0 이상이어야 합니다.' })
  minFundingAmount?: number

  @Transform(({ value }) => parseNumberIfPossible(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  @Min(0, { message: '최대 투자액은 0 이상이어야 합니다.' })
  maxFundingAmount?: number

  @Transform(({ value }) => parseNumberIfPossible(value))
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: '페이지는 정수여야 합니다.' }
  )
  @IsInt({ message: '페이지는 정수여야 합니다.' })
  @Min(1, { message: '페이지는 1 이상이어야 합니다.' })
  @IsOptional()
  page?: number

  @Transform(({ value }) => parseNumberIfPossible(value))
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: '페이지 크기는 정수여야 합니다.' }
  )
  @IsInt({ message: '페이지 크기는 정수여야 합니다.' })
  @Min(1, { message: '페이지 크기는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지 크기는 최대 100입니다.' })
  @IsOptional()
  limit?: number

  @Transform(({ value }) => parseBooleanString(value))
  @IsBooleanString({ message: '검증된 프로젝트만 보기 값은 true 또는 false 입니다.' })
  @IsOptional()
  onlyVerified?: 'true' | 'false'
}
