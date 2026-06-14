import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

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

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
const isUnique = (arr: unknown[]): boolean => new Set(arr).size === arr.length

const MATURITY_IDS = PROJECT_MATURITIES.map((m) => m.id) as [ProjectMaturity, ...ProjectMaturity[]]
const STACK_IDS = PROJECT_STACKS.map((s) => s.id) as [ProjectStack, ...ProjectStack[]]
const ACCESS_MODE_IDS = PROJECT_ACCESS_MODES.map((m) => m.id) as [
  ProjectAccessMode,
  ...ProjectAccessMode[],
]
const BUILD_TOOL_IDS = BUILD_TOOLS.map((t) => t.id) as [string, ...string[]]

/** 프로젝트 생성 요청 스키마 (zod, createZodDto). */
export const createProjectSchema = z
  .object({
    email: z
      .string({ error: '유효한 이메일 주소를 입력해주세요.' })
      .min(1, '이메일은 필수 항목입니다.')
      .email('유효한 이메일 주소를 입력해주세요.'),
    title: z
      .string({ error: '프로젝트 제목은 문자열이어야 합니다.' })
      .min(1, '프로젝트 제목은 필수 항목입니다.')
      .max(100, '프로젝트 제목은 100자 이하로 입력해주세요.'),
    description: z
      .string({ error: '프로젝트 설명은 문자열이어야 합니다.' })
      .min(1, '프로젝트 설명은 필수 항목입니다.')
      .max(1000, '프로젝트 설명은 1000자 이하로 입력해주세요.'),
    liveUrl: z
      .string({ error: 'Live URL은 필수 항목입니다.' })
      .min(1, 'Live URL은 필수 항목입니다.')
      .refine(isHttpUrl, {
        error: 'Live URL은 http:// 또는 https://로 시작하는 유효한 URL이어야 합니다.',
      }),
    category: z.enum([...PROJECT_CATEGORIES] as [ProjectCategory, ...ProjectCategory[]], {
      error: '유효한 카테고리를 선택해주세요.',
    }),
    maturity: z.enum(MATURITY_IDS, { error: '유효한 진행 단계를 선택해주세요.' }).optional(),
    stack: z.enum(STACK_IDS, { error: '유효한 빌드 유형을 선택해주세요.' }).optional(),
    accessMode: z.enum(ACCESS_MODE_IDS, { error: '유효한 공개 범위를 선택해주세요.' }),
    protectionNoticeAccepted: z
      .boolean({
        error: '상용화 전 서비스 노출 위험과 제출 권한 안내를 확인해야 등록할 수 있습니다.',
      })
      .refine((value) => value === true, {
        error: '상용화 전 서비스 노출 위험과 제출 권한 안내를 확인해야 등록할 수 있습니다.',
      }),
    thumbnail: z.string({ error: '썸네일은 문자열이어야 합니다.' }).optional(),
    tags: z
      .array(
        z
          .string({ error: '태그는 문자열이어야 합니다.' })
          .max(24, '태그는 24자 이하로 입력해주세요.'),
        {
          error: '태그는 배열이어야 합니다.',
        }
      )
      .max(8, '태그는 최대 8개까지 입력할 수 있습니다.')
      .refine(isUnique, { error: '중복 태그는 제거해주세요.' })
      .optional(),
    builtWith: z
      .array(z.enum(BUILD_TOOL_IDS, { error: '지원하지 않는 제작 도구입니다.' }), {
        error: '제작 도구는 배열이어야 합니다.',
      })
      .max(MAX_BUILD_TOOLS, `제작 도구는 최대 ${MAX_BUILD_TOOLS}개까지 선택할 수 있습니다.`)
      .refine(isUnique, { error: '중복 도구는 제거해주세요.' })
      .optional(),
    customTools: z
      .array(
        z
          .string({ error: '도구 이름은 문자열이어야 합니다.' })
          .max(24, '도구 이름은 24자 이하로 입력해주세요.'),
        { error: '직접 입력 도구는 배열이어야 합니다.' }
      )
      .max(MAX_CUSTOM_TOOLS, `직접 입력 도구는 최대 ${MAX_CUSTOM_TOOLS}개까지 입력할 수 있습니다.`)
      .refine(isUnique, { error: '중복 도구는 제거해주세요.' })
      .optional(),
    vibeCoded: z.boolean({ error: '바이브코딩 여부는 true 또는 false 입니다.' }).optional(),
  })
  .strict()

export class CreateProjectDto extends createZodDto(createProjectSchema) {}
