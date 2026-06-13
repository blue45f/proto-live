import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'

import { PROJECTS_STORE, type ProjectsStore } from '../projects/store/projects-store'

/**
 * 헬스 체크 컨트롤러
 * 서버 상태 모니터링 및 로드밸런서/오케스트레이터 프로브용 엔드포인트를 제공합니다.
 */
@Controller('api/health')
export class HealthController {
  constructor(@Inject(PROJECTS_STORE) private readonly store: ProjectsStore) {}

  /**
   * GET /api/health
   * 라이브니스: 서버의 현재 상태, 타임스탬프, 가동 시간을 반환합니다.
   */
  @Get()
  getHealth(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }

  /**
   * GET /api/health/ready
   * 리드니스: JSON 스토어가 사용 가능한지(디렉터리 쓰기 가능 + 기존 파일 파싱) 확인합니다.
   * 준비되지 않았으면 503으로 트래픽을 차단합니다.
   */
  @Get('ready')
  async getReady(): Promise<{ status: string; store: string; timestamp: string }> {
    const result = await this.store.checkReadiness()
    if (!result.ready) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        store: result.store,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      status: 'ready',
      store: result.store,
      timestamp: new Date().toISOString(),
    }
  }
}
