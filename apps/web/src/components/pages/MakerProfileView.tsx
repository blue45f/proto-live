import { ArrowUpRight, ChevronUp, Sparkles, TrendingUp, Users } from 'lucide-react'

import { maturityCopy } from '../../lib/constants'
import { formatWon } from '../../lib/format'

import type { MakerProfile, Project, ProjectMaturity } from '../../infrastructure/api'

type ProfileSummary = {
  total: number
  totalUpvotes: number
  verifiedCount: number
  investorCount: number
  committedAmountMax: number
  maturityCounts: Record<ProjectMaturity, number>
}

function summarizeProjects(projects: Project[]): ProfileSummary {
  const maturityCounts: Record<ProjectMaturity, number> = { early: 0, building: 0, live: 0 }

  let totalUpvotes = 0
  let verifiedCount = 0
  let investorCount = 0
  let committedAmountMax = 0

  for (const project of projects) {
    totalUpvotes += project.upvoteCount ?? 0
    investorCount += project.investorCount ?? 0
    committedAmountMax += project.committedAmountMax ?? 0
    if (project.validation?.success) {
      verifiedCount += 1
    }
    const maturity = project.maturity ?? 'live'
    maturityCounts[maturity] += 1
  }

  return {
    total: projects.length,
    totalUpvotes,
    verifiedCount,
    investorCount,
    committedAmountMax,
    maturityCounts,
  }
}

export function MakerProfileView({
  profile,
  isLoading,
  onBack,
  onOpenProject,
}: {
  profile: MakerProfile | null
  isLoading: boolean
  onBack: () => void
  onOpenProject: (project: Project) => void
}) {
  const summary = profile ? summarizeProjects(profile.projects) : null

  return (
    <section className="space-y-5 rounded-2xl border border-stone-800 bg-stone-950/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 transition hover:border-lime-300/50 hover:text-lime-100"
        >
          피드로 돌아가기
        </button>
      </div>

      {isLoading ? (
        <p className="rounded-lg border border-stone-800 bg-stone-950/45 p-4 text-sm text-stone-400">
          메이커 프로필을 불러오는 중입니다.
        </p>
      ) : !profile ? (
        <p className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-4 text-sm text-stone-400">
          메이커를 찾을 수 없습니다.
        </p>
      ) : (
        <>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">Maker</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-stone-50">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              공개된 프로젝트 {profile.projects.length}개
            </p>
          </div>

          {summary && summary.total > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
                  <Sparkles className="h-3.5 w-3.5 text-lime-200" />
                  라이브 검증
                </p>
                <p className="mt-1.5 text-xl font-black text-stone-50">
                  {summary.verifiedCount}
                  <span className="ml-1 text-xs font-bold text-stone-500">/ {summary.total}</span>
                </p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
                  <ChevronUp className="h-3.5 w-3.5 text-cyan-200" />
                  누적 추천
                </p>
                <p className="mt-1.5 text-xl font-black text-stone-50">{summary.totalUpvotes}</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
                  <Users className="h-3.5 w-3.5 text-amber-200" />
                  투자 관심
                </p>
                <p className="mt-1.5 text-xl font-black text-stone-50">{summary.investorCount}</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-200" />
                  관심 투자금
                </p>
                <p className="mt-1.5 text-xl font-black text-stone-50">
                  {formatWon(summary.committedAmountMax)}
                </p>
              </div>
            </div>
          )}

          {summary && summary.total > 0 && (
            <div className="flex flex-wrap gap-2">
              {(['live', 'building', 'early'] as const).map((maturity) =>
                summary.maturityCounts[maturity] > 0 ? (
                  <span
                    key={maturity}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ' +
                      maturityCopy[maturity].tone
                    }
                  >
                    {maturityCopy[maturity].label}
                    <span className="opacity-70">{summary.maturityCounts[maturity]}</span>
                  </span>
                ) : null
              )}
            </div>
          )}

          {profile.projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-4 text-sm text-stone-400">
              아직 공개된 프로젝트가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {profile.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/45 p-3 text-left transition hover:border-lime-300/40"
                >
                  <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] font-black text-stone-300">
                    <ChevronUp className="h-3.5 w-3.5" />
                    {project.upvoteCount ?? 0}
                  </span>
                  <span
                    className={
                      'rounded-full border px-2.5 py-1 text-[11px] font-black ' +
                      maturityCopy[project.maturity].tone
                    }
                  >
                    {maturityCopy[project.maturity].label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-stone-100">
                    {project.title}
                  </span>
                  <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-stone-500" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
