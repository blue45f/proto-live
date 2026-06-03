import { Gauge, Globe2, ShieldCheck, TimerReset, Zap } from 'lucide-react'
import type { MarketStats, Project } from '../api'
import { Metric } from './Metric'

export function ProofKpiRail({
  stats,
  protectedProjectCount,
  publicProjectCount,
  fastestResponseProject,
}: {
  stats: MarketStats
  protectedProjectCount: number
  publicProjectCount: number
  fastestResponseProject: Project | null
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Metric
        icon={ShieldCheck}
        label="확인된 사이트"
        value={`${stats.verifiedProjects}/${stats.totalProjects}`}
      />
      <Metric icon={Gauge} label="확인 완료율" value={`${stats.verificationRate}%`} />
      <Metric
        icon={TimerReset}
        label="평균 열림 속도"
        value={stats.averageResponseMs === null ? 'N/A' : `${stats.averageResponseMs}ms`}
      />
      <Metric icon={ShieldCheck} label="요청 후 공개" value={`${protectedProjectCount}`} />
      <Metric icon={Globe2} label="바로 보기 가능" value={`${publicProjectCount}`} />
      <Metric
        icon={Zap}
        label="가장 빠른 응답"
        value={
          fastestResponseProject?.validation.responseTimeMs
            ? `${fastestResponseProject.validation.responseTimeMs}ms`
            : 'N/A'
        }
      />
    </div>
  )
}
