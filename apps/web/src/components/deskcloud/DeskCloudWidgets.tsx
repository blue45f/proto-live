/**
 * DeskCloudWidgets — ProtoLive 에 붙는 DeskCloud 위젯 묶음(전부 env-gated).
 * ──────────────────────────────────────────────────────────────────────────
 * 각 desk 는 자기 VITE_*_URL 이 설정된 환경에서만 렌더됩니다. 미설정(기본)이면
 * 해당 위젯은 트리에 들어가지 않아 앱에 어떤 영향도 주지 않습니다(SurveyDesk
 * FeedbackWidget 과 동일한 게이팅 규약). publishable 키는 VITE_*_PK 가 있으면
 * 쓰고, 없으면 'pk_demo' 로 폴백합니다.
 *
 * 위젯 배치 원칙:
 *  - 보편(앱 전역) 위젯 — 체인지로그 런처 · 알림 벨 · 검색 ⌘K — 은 셸에 상주.
 *  - 콘텐츠 위젯 — 커뮤니티 게시판 · 후기 월 — 은 마땅한 페이지가 없으므로
 *    화면 구석의 떠 있는 런처(다이얼로그)로 비파괴적으로 노출.
 *  - 채팅은 자체 떠 있는 런처를 갖고 있어 그대로 마운트.
 *  - 알림 벨/커뮤니티/채팅은 로그인 사용자 식별자(memberId/recipientId)가 필요해
 *    인증된 세션에서만 마운트.
 *
 * 이 앱은 자체 헤더 알림 벨(../NotificationBell)을 이미 갖고 있어, DeskCloud
 * 알림 벨은 충돌을 피하려 컴포넌트명을 DeskNotificationBell 로 분리했습니다.
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'

import { navigate } from '../../router/route'

import { ChangelogWidget } from './changelog/ChangelogWidget'
import { ChatWidget } from './chat/ChatWidget'
import { CommunityBoard } from './community/CommunityBoard'
import { DeskNotificationBell } from './notify/DeskNotificationBell'
import { TestimonialWall } from './review/ReviewWidgets'
import { SearchPalette, type SearchHit } from './search/SearchPalette'

const env = import.meta.env

/** VITE_<DESK>_PK 가 있으면 사용, 없으면 데모 키. publishable 키는 브라우저 노출 안전. */
function pk(value: string | undefined): string {
  return value && value.length > 0 ? value : 'pk_demo'
}

/**
 * SearchDesk 결과 선택 핸들러. 같은 출처(앱 내부) 경로면 핸드롤 라우터로 SPA 내비게이션
 * (history.pushState + popstate 재해석)해 풀 페이지 리로드를 피하고, 외부/교차 출처
 * URL 이면 기존대로 풀 내비게이션한다. url 이 없으면 아무것도 하지 않는다.
 */
function navigateToSearchHit(hit: SearchHit): void {
  const url = hit.url
  if (!url) return
  if (typeof window === 'undefined') return

  let target: URL
  try {
    target = new URL(url, window.location.origin)
  } catch {
    // 파싱 불가한 값은 안전하게 풀 내비게이션으로 위임.
    window.location.assign(url)
    return
  }

  // 같은 출처면 SPA 라우팅: pushState 후 popstate 를 합성 발행해 앱이 라우트를 재해석한다.
  if (target.origin === window.location.origin) {
    navigate(target.pathname + target.search + target.hash)
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }
  window.location.assign(target.href)
}

/**
 * 떠 있는 런처 — 마땅한 호스트 페이지가 없는 콘텐츠 위젯(커뮤니티·후기)을
 * 화면 구석 버튼 → 다이얼로그로 비파괴적으로 노출. 접근성: Esc 닫기 · 포커스 복귀 ·
 * aria-modal · prefers-reduced-motion 은 인라인 스타일로 모션 최소.
 */
function DeskLauncher({
  label,
  title,
  side = 'right',
  children,
}: {
  label: string
  title: string
  side?: 'left' | 'right'
  children: ReactNode
}): ReactElement {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  const offset = side === 'right' ? { right: 16 } : { left: 16 }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          position: 'fixed',
          bottom: 16,
          ...offset,
          zIndex: 2147482000,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 40,
          padding: '0 14px',
          borderRadius: 999,
          border: '1px solid #44403c',
          background: '#1c1917',
          color: '#e7e5e4',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
      {open ? (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147482600,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
            padding: 16,
            background: 'rgba(12,10,9,0.55)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{
              width: 'min(440px, calc(100vw - 32px))',
              maxHeight: 'min(640px, calc(100vh - 96px))',
              overflow: 'auto',
              borderRadius: 16,
              background: '#ffffff',
              boxShadow: '0 24px 64px -16px rgba(0,0,0,0.55)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <strong style={{ fontSize: 14, color: '#1a1d23' }}>{title}</strong>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
                aria-label="닫기"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 0,
                  background: 'transparent',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 8 }}>{children}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}

/** 헤더에 들어가는 보편 위젯(알림 벨 등) — 인증 사용자 식별자가 필요하면 recipientId 로 받음. */
export function DeskCloudHeaderWidgets({
  recipientId,
}: {
  recipientId: string | null
}): ReactElement | null {
  if (!env.VITE_NOTIFYDESK_URL || !recipientId) return null
  return (
    <DeskNotificationBell
      recipientId={recipientId}
      publishableKey={pk(env.VITE_NOTIFYDESK_PK)}
      endpoint={env.VITE_NOTIFYDESK_URL}
    />
  )
}

/**
 * 셸 하단에 마운트되는 떠 있는/전역 위젯 묶음. 각 desk 는 VITE_*_URL 게이팅.
 * memberId 는 로그인 사용자(`user_<id>`) — 없으면 사용자 식별이 필요한 위젯은 생략.
 */
export function DeskCloudFloatingWidgets({
  memberId,
  memberName,
}: {
  memberId: string | null
  memberName?: string
}): ReactElement | null {
  const changelogOn = Boolean(env.VITE_CHANGELOGDESK_URL)
  const searchOn = Boolean(env.VITE_SEARCHDESK_URL)
  const communityOn = Boolean(env.VITE_COMMUNITYDESK_URL) && Boolean(memberId)
  const chatOn = Boolean(env.VITE_CHATDESK_URL) && Boolean(memberId)
  const reviewOn = Boolean(env.VITE_REVIEWDESK_URL)

  if (!changelogOn && !searchOn && !communityOn && !chatOn && !reviewOn) return null

  return (
    <>
      {/* ChangelogDesk — 떠 있는 "새 소식" 런처(자체 포지셔닝). */}
      {changelogOn ? (
        <ChangelogWidget
          publishableKey={pk(env.VITE_CHANGELOGDESK_PK)}
          endpoint={env.VITE_CHANGELOGDESK_URL}
        />
      ) : null}

      {/* SearchDesk — 전역 ⌘K 명령 팔레트(핫키 자체 등록, 평소엔 비가시).
          결과 선택 시 앱 내부 경로는 SPA 라우팅(풀 리로드 없음)으로 이동한다. */}
      {searchOn ? (
        <SearchPalette
          publishableKey={pk(env.VITE_SEARCHDESK_PK)}
          endpoint={env.VITE_SEARCHDESK_URL}
          onSelect={navigateToSearchHit}
        />
      ) : null}

      {/* CommunityDesk — 떠 있는 런처 → 게시판 다이얼로그(로그인 사용자만). */}
      {communityOn && memberId ? (
        <DeskLauncher label="커뮤니티" title="커뮤니티" side="left">
          <CommunityBoard
            boardSlug="general"
            memberId={memberId}
            memberName={memberName}
            publishableKey={pk(env.VITE_COMMUNITYDESK_PK)}
            endpoint={env.VITE_COMMUNITYDESK_URL}
          />
        </DeskLauncher>
      ) : null}

      {/* ReviewDesk — 떠 있는 런처 → 후기 월 다이얼로그(공개). */}
      {reviewOn ? (
        <DeskLauncher label="후기" title="고객 후기" side="left">
          <TestimonialWall
            publishableKey={pk(env.VITE_REVIEWDESK_PK)}
            endpoint={env.VITE_REVIEWDESK_URL}
          />
        </DeskLauncher>
      ) : null}

      {/* ChatDesk — 자체 떠 있는 채팅 런처(로그인 사용자만). */}
      {chatOn && memberId ? (
        <ChatWidget
          memberId={memberId}
          memberName={memberName}
          publishableKey={pk(env.VITE_CHATDESK_PK)}
          endpoint={env.VITE_CHATDESK_URL}
        />
      ) : null}
    </>
  )
}
