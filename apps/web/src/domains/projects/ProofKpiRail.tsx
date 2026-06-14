import { ShieldCheck, TimerReset, Zap } from 'lucide-react'

import { Metric } from '../../components/Metric'

import type { MarketStats, Project } from '../../infrastructure/api'

/**
 * 피드 상단 "라이브 증명" 요약. 히어로에 이미 진행 상황 패널이 있으므로, 여기서는 커뮤니티가
 * 한눈에 신뢰할 3가지(검증된 빌드 수 · 평균 열림 속도 · 최고 응답)만 보여 과밀을 줄인다.
 */
export function ProofKpiRail({
  stats,
  fastestResponseProject,
}: {
  stats: MarketStats
  fastestResponseProject: Project | null
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Metric
        icon={ShieldCheck}
        label="확인된 라이브 빌드"
        value={`${stats.verifiedProjects}/${stats.totalProjects}`}
      />
      <Metric
        icon={TimerReset}
        label="평균 열림 속도"
        value={stats.averageResponseMs === null ? 'N/A' : `${stats.averageResponseMs}ms`}
      />
      <Metric
        icon={Zap}
        label="가장 빠른 응답"
        value={
          fastestResponseProject?.validation.responseTimeMs != null
            ? `${fastestResponseProject.validation.responseTimeMs}ms`
            : 'N/A'
        }
      />
    </div>
  )
}
