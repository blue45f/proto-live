import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FUNDING_RANGES, FundingRangeId } from '../project.constants';

const FUNDING_RANGE_IDS = FUNDING_RANGES.map((range) => range.id);

export class CreateMatchProposalDto {
  @IsString({ message: '투자 구간은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '투자 구간은 필수 항목입니다.' })
  @IsIn(FUNDING_RANGE_IDS, { message: '유효한 투자 구간을 선택해주세요.' })
  fundingRangeId: FundingRangeId;

  @IsString({ message: '메시지는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '메시지는 필수 항목입니다.' })
  @MaxLength(700, { message: '메시지는 700자 이하로 입력해주세요.' })
  message: string;
}
