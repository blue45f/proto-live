import { ArrayMaxSize, IsArray, IsInt, IsOptional } from 'class-validator'

export class MarkNotificationsReadDto {
  // 미지정 시 전체 읽음 처리. 지정 시 해당 알림 id만.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  ids?: number[]
}
