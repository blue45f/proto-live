import { Bell, Briefcase, ChevronUp, MessageSquare, Star } from 'lucide-react'
import type { AppNotification, NotificationType } from '../api'
import { formatRelativeTime } from '../lib/format'

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  review: MessageSquare,
  upvote: ChevronUp,
  featured: Star,
  match: Briefcase,
}

/**
 * 헤더 알림 벨. 네이티브 <details> 드롭다운(무의존). 열면 전체 읽음 처리하고,
 * 항목 클릭 시 해당 프로젝트 상세로 이동한다. 미읽음 개수를 배지로 표시.
 */
export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  onOpen,
}: {
  notifications: AppNotification[]
  unreadCount: number
  onMarkAllRead: () => void
  onOpen: (notification: AppNotification) => void
}) {
  return (
    <details
      className="protolive-bell relative shrink-0"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          onMarkAllRead()
        }
      }}
    >
      <summary
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 안 읽음` : '알림'}
        className="relative grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 text-stone-300 transition hover:border-lime-300/40 hover:text-lime-100 [&::-webkit-details-marker]:hidden"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-lime-300 px-1 text-[10px] font-black text-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-stone-700 bg-stone-950/95 p-1 shadow-[0_16px_40px_oklch(20%_0.02_250/0.2)] backdrop-blur">
        <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-stone-400">
          알림
        </p>
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-stone-400">아직 받은 알림이 없습니다.</p>
        ) : (
          notifications.slice(0, 15).map((notification) => {
            const Icon = TYPE_ICON[notification.type] ?? Bell
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => onOpen(notification)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-lime-300/10 ${
                  notification.read ? '' : 'bg-lime-300/[0.05]'
                }`}
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-stone-700 text-lime-200">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-stone-100">
                    {notification.body}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-stone-400">
                    {notification.projectTitle} · {formatRelativeTime(notification.createdAt)}
                  </span>
                </span>
                {notification.read ? null : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime-300" />
                )}
              </button>
            )
          })
        )}
      </div>
    </details>
  )
}
