import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ProjectEventType } from '../project.models';

const PROJECT_EVENT_TYPES: ProjectEventType[] = ['preview', 'outbound', 'refresh'];

export class RecordProjectEventDto {
  @IsString({ message: '이벤트 타입은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '이벤트 타입은 필수 항목입니다.' })
  @IsIn(PROJECT_EVENT_TYPES, { message: '기록 가능한 이벤트 타입을 선택해주세요.' })
  type: ProjectEventType;
}
