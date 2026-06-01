import { Transform } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ProjectAccessMode, ProjectCategory, PROJECT_CATEGORIES } from '../project.constants';

export type ProjectSortKey = 'signal' | 'recent' | 'created';

export interface ProjectQueryInput {
  category?: string;
  accessMode?: ProjectAccessMode;
  q?: string;
  onlyVerified?: boolean;
  minSignal?: number;
  sort?: ProjectSortKey;
}

export class GetProjectsQueryDto {
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @IsOptional()
  q?: string;

  @IsIn(PROJECT_CATEGORIES as readonly string[], { message: '카테고리가 유효하지 않습니다.' })
  @IsOptional()
  category?: ProjectCategory;

  @IsIn(['screened', 'open'], { message: '공개 범위가 유효하지 않습니다.' })
  @IsOptional()
  accessMode?: ProjectAccessMode;

  @IsIn(['signal', 'recent', 'created'], { message: '정렬 옵션이 유효하지 않습니다.' })
  @IsOptional()
  sort?: ProjectSortKey;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  })
  @IsInt({ message: '최소 시그널은 정수여야 합니다.' })
  @Min(0, { message: '최소 시그널은 0 이상이어야 합니다.' })
  @IsOptional()
  minSignal?: number;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  })
  @IsBooleanString({ message: '검증된 프로젝트만 보기 값은 true 또는 false 입니다.' })
  @IsOptional()
  onlyVerified?: 'true' | 'false';
}
