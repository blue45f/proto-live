/**
 * NotifyDesk 네이티브 알림 벨 — 외부 위젯(다른 톤의 떠 있는 벨) 임베드 대체.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 공개(`pk_`) NotifyClient.getInbox()/markRead() 로 수신자
 * 인박스를 읽고 읽음 처리한다. 화면은 이 앱의 기존 NotificationBell 과 동일한 Radix
 * Popover 패턴·디자인 토큰으로 렌더해, 헤더에서 1차 알림 벨과 같은 룩앤필을 갖는다.
 *
 * 게이팅: VITE_NOTIFYDESK_URL 미설정 또는 비로그인(recipientId 없음)이면 렌더하지
 * 않는다(가역적). 앱 자체 NotificationBell 과는 별개 컴포넌트라 충돌하지 않는다 —
 * NotifyDesk 는 교차 서비스 알림(외부 desk 발) 전용 인박스다.
 */
import * as Popover from '@radix-ui/react-popover'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'

import { getNotifyClient } from '../../lib/deskcloud'
import { formatRelativeTime } from '../../lib/format'

import type { NotifyInbox } from '@heejun/deskcloud'

export function DeskInboxBell({ recipientId }: { recipientId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['deskcloud', 'notify', 'inbox', recipientId] as const

  const query = useQuery<NotifyInbox>({
    queryKey,
    staleTime: 60_000,
    refetchInterval: 90_000,
    queryFn: async () => {
      const client = getNotifyClient()
      if (!client) return { items: [], unreadCount: 0, limit: 0 }
      return client.getInbox({ recipientId, limit: 15 })
    },
  })

  const inbox = query.data
  const unreadCount = inbox?.unreadCount ?? 0
  const items = inbox?.items ?? []

  async function markAllRead() {
    if (unreadCount === 0) return
    const client = getNotifyClient()
    if (!client) return
    try {
      await client.markRead({ recipientId, all: true })
    } finally {
      void queryClient.invalidateQueries({ queryKey })
    }
  }

  return (
    <Popover.Root
      onOpenChange={(next) => {
        if (next) void markAllRead()
      }}
    >
      <Popover.Trigger
        aria-label={unreadCount > 0 ? `소식 ${unreadCount}개 안 읽음` : '소식함'}
        className="relative grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
      >
        <Inbox className="h-4 w-4" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-cyan-300 px-1 text-[10px] font-black text-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-30 max-h-96 w-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-stone-700 bg-stone-950/95 p-1 shadow-[0_16px_40px_oklch(20%_0.02_250/0.2)] backdrop-blur"
        >
          <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-stone-400">
            소식함
          </p>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-stone-400">
              {query.isPending ? '불러오는 중…' : '아직 받은 소식이 없습니다.'}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left ${
                  item.status === 'read' ? '' : 'bg-cyan-300/[0.05]'
                }`}
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-stone-700 text-cyan-200">
                  <Inbox className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-stone-100">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 block text-xs leading-5 text-stone-300">
                      {item.body}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-xs text-stone-400">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
                {item.status === 'read' ? null : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" aria-hidden />
                )}
              </div>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
