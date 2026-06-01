import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ArrayMinSize,
} from 'class-validator';

function parseNumberIfPossible(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : value;
}

function parseNumberOrUndefined(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return parseNumberIfPossible(value);
}

function parseScenarioMultipliers(value: unknown): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const entries = Array.isArray(value) ? value : [value];
  const parsed = entries
    .flatMap((entry) => {
      if (typeof entry !== 'string') {
        return [entry];
      }

      return entry.split(',').map((item) => item.trim()).filter(Boolean);
    })
    .map((entry) => parseNumberIfPossible(entry))
    .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry));

  return parsed.length > 0 ? parsed : undefined;
}

export class AdminRevenueProjectionQueryDto {
  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '메이커 월 구독료는 숫자여야 합니다.' })
  makerMonthlyFee?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '투자자 월 구독료는 숫자여야 합니다.' })
  investorMonthlyFee?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '리드 캡처 수수료는 숫자여야 합니다.' })
  leadCaptureFee?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '메이커 전환률은 숫자여야 합니다.' })
  @Min(0, { message: '메이커 전환률은 0 이상이어야 합니다.' })
  @Max(100, { message: '메이커 전환률은 100 이하여야 합니다.' })
  makerConversionRate?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '투자자 전환률은 숫자여야 합니다.' })
  @Min(0, { message: '투자자 전환률은 0 이상이어야 합니다.' })
  @Max(100, { message: '투자자 전환률은 100 이하여야 합니다.' })
  investorConversionRate?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '리드 전환률은 숫자여야 합니다.' })
  @Min(0, { message: '리드 전환률은 0 이상이어야 합니다.' })
  @Max(100, { message: '리드 전환률은 100 이하여야 합니다.' })
  closeLeadRate?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '성공 수수료율은 숫자여야 합니다.' })
  @Min(0, { message: '성공 수수료율은 0 이상이어야 합니다.' })
  @Max(100, { message: '성공 수수료율은 100 이하여야 합니다.' })
  successFeeRate?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '투자자 획득비용은 숫자여야 합니다.' })
  @Min(0, { message: '투자자 획득비용은 0 이상이어야 합니다.' })
  investorAcquisitionCost?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '메이커 획득비용은 숫자여야 합니다.' })
  @Min(0, { message: '메이커 획득비용은 0 이상이어야 합니다.' })
  makerAcquisitionCost?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '월간 이탈률은 숫자여야 합니다.' })
  @Min(0.01, { message: '월간 이탈률은 0.01 이상이어야 합니다.' })
  @Max(99.99, { message: '월간 이탈률은 99.99 이하여야 합니다.' })
  estimatedMonthlyChurnRate?: number;

  @Transform(({ value }) => parseNumberOrUndefined(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '목표 월매출은 숫자여야 합니다.' })
  @Min(0, { message: '목표 월매출은 0 이상이어야 합니다.' })
  targetMonthlyRevenue?: number;

  @Transform(({ value }) => parseScenarioMultipliers(value))
  @IsOptional()
  @IsArray({ message: '시나리오 배율은 배열이어야 합니다.' })
  @ArrayMinSize(1, { message: '시나리오 배율은 최소 1개 이상 입력해야 합니다.' })
  @IsNumber(
    {},
    { each: true, message: '각 시나리오 배율은 숫자여야 합니다.' },
  )
  @Min(0.05, { each: true, message: '시나리오 배율은 0.05 이상이어야 합니다.' })
  @Max(5, { each: true, message: '시나리오 배율은 5 이하이어야 합니다.' })
  scenarioMultipliers?: number[];
}
