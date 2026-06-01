import { Controller, Get } from '@nestjs/common';

/**
 * 헬스 체크 컨트롤러
 * 서버 상태 모니터링 및 로드밸런서 프로브용 엔드포인트를 제공합니다.
 */
@Controller('api/health')
export class HealthController {
  /**
   * GET /api/health
   * 서버의 현재 상태, 타임스탬프, 가동 시간을 반환합니다.
   */
  @Get()
  getHealth(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
