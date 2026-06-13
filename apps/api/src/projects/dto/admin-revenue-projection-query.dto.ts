import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const parseNumberIfPossible = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const next = Number.parseFloat(value)
  return Number.isFinite(next) ? next : value
}
const parseNumberOrUndefined = (value: unknown): unknown =>
  value === undefined ? undefined : parseNumberIfPossible(value)

const parseScenarioMultipliers = (value: unknown): unknown => {
  if (value === undefined) return undefined
  const entries = Array.isArray(value) ? value : [value]
  const parsed = entries
    .flatMap((entry) => {
      if (typeof entry !== 'string') return [entry]
      return entry
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    })
    .map((entry) => parseNumberIfPossible(entry))
    .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
  return parsed.length > 0 ? parsed : undefined
}

const optionalRate = (label: string) =>
  z.preprocess(
    parseNumberOrUndefined,
    z
      .number({ error: `${label}은 숫자여야 합니다.` })
      .min(0, `${label}은 0 이상이어야 합니다.`)
      .max(100, `${label}은 100 이하여야 합니다.`)
      .optional()
  )

const optionalAmount = (label: string) =>
  z.preprocess(
    parseNumberOrUndefined,
    z
      .number({ error: `${label}은 숫자여야 합니다.` })
      .min(0, `${label}은 0 이상이어야 합니다.`)
      .optional()
  )

export const adminRevenueProjectionQuerySchema = z
  .object({
    makerMonthlyFee: z.preprocess(
      parseNumberOrUndefined,
      z.number({ error: '메이커 월 구독료는 숫자여야 합니다.' }).optional()
    ),
    investorMonthlyFee: z.preprocess(
      parseNumberOrUndefined,
      z.number({ error: '투자자 월 구독료는 숫자여야 합니다.' }).optional()
    ),
    leadCaptureFee: z.preprocess(
      parseNumberOrUndefined,
      z.number({ error: '리드 캡처 수수료는 숫자여야 합니다.' }).optional()
    ),
    makerConversionRate: optionalRate('메이커 전환률'),
    investorConversionRate: optionalRate('투자자 전환률'),
    closeLeadRate: optionalRate('리드 전환률'),
    successFeeRate: optionalRate('성공 수수료율'),
    investorAcquisitionCost: optionalAmount('투자자 획득비용'),
    makerAcquisitionCost: optionalAmount('메이커 획득비용'),
    estimatedMonthlyChurnRate: z.preprocess(
      parseNumberOrUndefined,
      z
        .number({ error: '월간 이탈률은 숫자여야 합니다.' })
        .min(0.01, '월간 이탈률은 0.01 이상이어야 합니다.')
        .max(99.99, '월간 이탈률은 99.99 이하여야 합니다.')
        .optional()
    ),
    targetMonthlyRevenue: z.preprocess(
      parseNumberOrUndefined,
      z
        .number({ error: '목표 월매출은 숫자여야 합니다.' })
        .min(0, '목표 월매출은 0 이상이어야 합니다.')
        .optional()
    ),
    scenarioMultipliers: z.preprocess(
      parseScenarioMultipliers,
      z
        .array(
          z
            .number({ error: '각 시나리오 배율은 숫자여야 합니다.' })
            .min(0.05, '시나리오 배율은 0.05 이상이어야 합니다.')
            .max(5, '시나리오 배율은 5 이하이어야 합니다.'),
          { error: '시나리오 배율은 배열이어야 합니다.' }
        )
        .min(1, '시나리오 배율은 최소 1개 이상 입력해야 합니다.')
        .optional()
    ),
  })
  .strict()

export class AdminRevenueProjectionQueryDto extends createZodDto(
  adminRevenueProjectionQuerySchema
) {}
