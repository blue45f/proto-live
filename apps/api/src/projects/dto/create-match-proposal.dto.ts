import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { FUNDING_RANGES, FundingRangeId } from '../project.constants'

const FUNDING_RANGE_IDS = FUNDING_RANGES.map((range) => range.id) as [
  FundingRangeId,
  ...FundingRangeId[],
]

// @Equals(true) 대응 — 타입은 boolean 유지하되 런타임에서 true 만 허용한다.
const mustBeTrue = (message: string) =>
  z.boolean({ error: message }).refine((value) => value === true, { error: message })

export const createMatchProposalSchema = z
  .object({
    fundingRangeId: z.enum(FUNDING_RANGE_IDS, { error: '유효한 투자 구간을 선택해주세요.' }),
    message: z
      .string({ error: '메시지는 문자열이어야 합니다.' })
      .min(1, '메시지는 필수 항목입니다.')
      .max(700, '메시지는 700자 이하로 입력해주세요.'),
    legalNoticeAccepted: mustBeTrue(
      '투자 권유가 아니라 창업자와의 연락 의향 기록임을 확인해야 합니다.'
    ),
    privacyConsentAccepted: mustBeTrue('연락을 위한 개인정보 전달 동의가 필요합니다.'),
    riskNoticeAccepted: mustBeTrue('초기 프로토타입 투자 검토의 위험 안내를 확인해야 합니다.'),
    consentVersion: z.string({ error: '동의 약관 버전은 문자열이어야 합니다.' }).max(40).optional(),
    consentHash: z.string({ error: '동의 약관 해시는 문자열이어야 합니다.' }).max(128).optional(),
  })
  .strict()

export class CreateMatchProposalDto extends createZodDto(createMatchProposalSchema) {}
