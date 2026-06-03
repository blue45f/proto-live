import { Equals, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { FUNDING_RANGES, FundingRangeId } from '../project.constants'

const FUNDING_RANGE_IDS = FUNDING_RANGES.map((range) => range.id)

export class CreateMatchProposalDto {
  @IsString({ message: '투자 구간은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '투자 구간은 필수 항목입니다.' })
  @IsIn(FUNDING_RANGE_IDS, { message: '유효한 투자 구간을 선택해주세요.' })
  fundingRangeId: FundingRangeId

  @IsString({ message: '메시지는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '메시지는 필수 항목입니다.' })
  @MaxLength(700, { message: '메시지는 700자 이하로 입력해주세요.' })
  message: string

  @Equals(true, { message: '투자 권유가 아니라 창업자와의 연락 의향 기록임을 확인해야 합니다.' })
  legalNoticeAccepted: boolean

  @Equals(true, { message: '연락을 위한 개인정보 전달 동의가 필요합니다.' })
  privacyConsentAccepted: boolean

  @Equals(true, { message: '초기 프로토타입 투자 검토의 위험 안내를 확인해야 합니다.' })
  riskNoticeAccepted: boolean
}
