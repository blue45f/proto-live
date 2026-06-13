import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  ProjectAccessMode,
  ProjectCategory,
  ProjectMaturity,
  ProjectStack,
  PROJECT_CATEGORIES,
  PROJECT_MATURITIES,
  PROJECT_STACKS,
} from '../project.constants'

export type ProjectSortKey = 'signal' | 'recent' | 'created' | 'funding' | 'upvotes'

export interface ProjectQueryInput {
  category?: string
  maturity?: ProjectMaturity
  stack?: ProjectStack
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
  featured?: boolean
}

const trimOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
const parseNumberIfPossible = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const next = Number.parseFloat(value)
  return Number.isFinite(next) ? next : value
}
const parseBooleanString = (value: unknown): unknown => {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return value
  return value.trim().toLowerCase()
}

const MATURITY_IDS = PROJECT_MATURITIES.map((m) => m.id) as [ProjectMaturity, ...ProjectMaturity[]]
const STACK_IDS = PROJECT_STACKS.map((s) => s.id) as [ProjectStack, ...ProjectStack[]]

export const getProjectsQuerySchema = z
  .object({
    q: z.preprocess(
      trimOrUndefined,
      z.string({ error: '검색어는 문자열이어야 합니다.' }).optional()
    ),
    category: z.preprocess(
      trimOrUndefined,
      z
        .enum([...PROJECT_CATEGORIES] as [ProjectCategory, ...ProjectCategory[]], {
          error: '카테고리가 유효하지 않습니다.',
        })
        .optional()
    ),
    maturity: z.preprocess(
      trimOrUndefined,
      z.enum(MATURITY_IDS, { error: '진행 단계가 유효하지 않습니다.' }).optional()
    ),
    stack: z.preprocess(
      trimOrUndefined,
      z.enum(STACK_IDS, { error: '빌드 유형이 유효하지 않습니다.' }).optional()
    ),
    accessMode: z.preprocess(
      trimOrUndefined,
      z.enum(['screened', 'open'], { error: '공개 범위가 유효하지 않습니다.' }).optional()
    ),
    tag: z.preprocess(
      trimOrUndefined,
      z
        .string({ error: '태그는 문자열이어야 합니다.' })
        .max(24, '태그는 24자 이하로 입력해주세요.')
        .optional()
    ),
    sort: z.preprocess(
      trimOrUndefined,
      z
        .enum(['signal', 'recent', 'created', 'funding', 'upvotes'], {
          error: '정렬 옵션이 유효하지 않습니다.',
        })
        .optional()
    ),
    minSignal: z.preprocess(
      parseNumberIfPossible,
      z
        .number({ error: '최소 시그널은 정수여야 합니다.' })
        .int('최소 시그널은 정수여야 합니다.')
        .min(0, '최소 시그널은 0 이상이어야 합니다.')
        .max(1000, '최소 시그널은 1000 이하이어야 합니다.')
        .optional()
    ),
    minFundingAmount: z.preprocess(
      parseNumberIfPossible,
      z
        .number({ error: '최소 투자액은 숫자여야 합니다.' })
        .min(0, '최소 투자액은 0 이상이어야 합니다.')
        .optional()
    ),
    maxFundingAmount: z.preprocess(
      parseNumberIfPossible,
      z
        .number({ error: '최대 투자액은 숫자여야 합니다.' })
        .min(0, '최대 투자액은 0 이상이어야 합니다.')
        .optional()
    ),
    page: z.preprocess(
      parseNumberIfPossible,
      z
        .number({ error: '페이지는 정수여야 합니다.' })
        .int('페이지는 정수여야 합니다.')
        .min(1, '페이지는 1 이상이어야 합니다.')
        .optional()
    ),
    limit: z.preprocess(
      parseNumberIfPossible,
      z
        .number({ error: '페이지 크기는 정수여야 합니다.' })
        .int('페이지 크기는 정수여야 합니다.')
        .min(1, '페이지 크기는 1 이상이어야 합니다.')
        .max(100, '페이지 크기는 최대 100입니다.')
        .optional()
    ),
    onlyVerified: z.preprocess(
      parseBooleanString,
      z
        .enum(['true', 'false'], { error: '검증된 프로젝트만 보기 값은 true 또는 false 입니다.' })
        .optional()
    ),
    featured: z.preprocess(
      parseBooleanString,
      z
        .enum(['true', 'false'], { error: '투자 검토 대상만 보기 값은 true 또는 false 입니다.' })
        .optional()
    ),
  })
  .strict()

export class GetProjectsQueryDto extends createZodDto(getProjectsQuerySchema) {}
