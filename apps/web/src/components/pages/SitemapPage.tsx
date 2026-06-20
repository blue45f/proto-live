import { Zap } from 'lucide-react'

const routes = [
  { href: '/', label: '프로토타입 마켓', helper: '프로젝트 목록과 필터' },
  { href: '/projects/:id', label: '프로젝트 상세', helper: '프로젝트 로그와 리뷰' },
  { href: '/makers/:id', label: '메이커 프로필', helper: '제작자별 포트폴리오' },
  { href: '/submit', label: '프로젝트 등록', helper: '신규 프로토타입 제출' },
  { href: '/about', label: '소개', helper: '서비스 사용 가이드' },
  { href: '/support', label: '문의', helper: '공개 문의 접수' },
  { href: '/messages', label: '쪽지함', helper: '회원 간 대화' },
  { href: '/messages/:id', label: '쪽지 상세', helper: '개별 대화방' },
  { href: '/projects/:id/discussions', label: '프로젝트 토론', helper: '프로젝트별 커뮤니티' },
  { href: '/projects/:id/discussions/new', label: '새 토론', helper: '토론 작성' },
  { href: '/projects/:id/discussions/:discussionId', label: '토론 상세', helper: '스레드 보기' },
  { href: '/terms', label: '이용약관', helper: 'TermsDesk 게시본' },
  { href: '/privacy', label: '개인정보처리방침', helper: 'TermsDesk 게시본' },
  { href: '/admin', label: '운영 콘솔', helper: '관리자 대시보드' },
  { href: '/admin/community', label: '커뮤니티 모더레이션', helper: '운영자용 토론 관리' },
  { href: '/admin/members', label: '회원 관리', helper: '운영자용 회원 관리' },
  { href: '/design', label: '디자인 시스템', helper: '토큰과 컴포넌트 스타일가이드' },
] as const

export default function SitemapPage() {
  return (
    <main className="min-h-screen bg-base px-4 py-8 text-stone-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl rounded-2xl border border-stone-800 bg-stone-950/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-lime-300 text-slate-950">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">
              BETA Sitemap
            </p>
            <h1 className="text-3xl font-black tracking-tight">ProtoLive 사이트맵</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400">
          프로토타입 마켓, 커뮤니티, 운영 콘솔, 법적 고지, 디자인 시스템 경로를 한 화면에
          정리했습니다.
        </p>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <a
            key={route.href}
            href={route.href}
            className="grid min-h-28 gap-2 rounded-xl border border-stone-800 bg-stone-950/70 p-4 transition hover:border-lime-300/50"
          >
            <strong>{route.label}</strong>
            <small className="text-sm leading-5 text-stone-400">{route.helper}</small>
            <code className="text-xs text-stone-500 [overflow-wrap:anywhere]">{route.href}</code>
          </a>
        ))}
      </section>
    </main>
  )
}
