/**
 * SearchDesk 네이티브 ⌘K 검색 팔레트 — 외부 검색 위젯 임베드 대체.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 공개(`pk_`) SearchClient.search() 로 질의하고, 결과는 이 앱의
 * Radix Dialog + 디자인 토큰으로 렌더한다(외부 위젯 CSS 없음). ⌘K / Ctrl+K 로 열리고
 * (앱의 `/` 인앱 필터 단축키와 분리), 결과 선택 시 같은 출처 경로는 SPA 라우팅으로,
 * 외부 URL 은 풀 내비게이션으로 이동한다.
 *
 * 게이팅: VITE_SEARCHDESK_URL 미설정이면 마운트하지 않는다(가역적). 미설정 환경에선
 * 앱의 기존 인앱 검색(헤더 필터, `/` 단축키)만 남는다.
 *
 * 접근성: role=dialog(Radix) · combobox/listbox · aria-activedescendant · 화살표/Enter/
 * Esc 키보드 조작 · focus-visible(앱 전역) · 모션은 motion-safe 게이트.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { getSearchClient } from '../../lib/deskcloud'

import type { SearchHit } from '@heejun/deskcloud'

/** highlight 마크업(`<mark>`)에서 텍스트만 추출(HTML 주입 표면 없이 평문 렌더). */
function stripHighlight(value: string): string {
  return value.replace(/<\/?mark>/g, '')
}

/**
 * 같은 출처면 SPA 라우팅(history.pushState + popstate 합성으로 앱이 라우트를 재해석),
 * 아니면 풀 내비게이션. url 이 없으면 무시. 앱 라우터(app 계층)에 의존하지 않도록
 * History API 를 직접 쓴다(이 컴포넌트는 shared 계층) — 동작은 핸드롤 라우터와 동일.
 */
function goToHit(hit: SearchHit): void {
  const url = hit.url
  if (!url || typeof window === 'undefined') return
  let target: URL
  try {
    target = new URL(url, window.location.origin)
  } catch {
    window.location.assign(url)
    return
  }
  if (target.origin === window.location.origin) {
    window.history.pushState({}, '', target.pathname + target.search + target.hash)
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }
  window.location.assign(target.href)
}

export function SearchCommandPalette() {
  const enabled = Boolean(getSearchClient())
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  // ⌘K / Ctrl+K 전역 핫키(인앱 `/` 필터 단축키와 분리). enabled 일 때만 등록.
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])

  const query = useQuery({
    queryKey: ['deskcloud', 'search', term],
    enabled: enabled && open && term.trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const client = getSearchClient()
      if (!client) return []
      const response = await client.search({ q: term.trim(), limit: 8 })
      return response.hits
    },
  })

  const hits = query.data ?? []
  // 결과가 줄어들어도 activeIndex 가 범위를 벗어나지 않도록 렌더 시 클램프한다
  // (term 변경 시 onChange 에서 0 으로 리셋 — 이펙트 안 setState 회피).
  const activeOption = hits.length === 0 ? 0 : Math.min(activeIndex, hits.length - 1)

  if (!enabled) return null

  function selectAt(index: number) {
    const hit = hits[index]
    if (!hit) return
    setOpen(false)
    goToHit(hit)
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(hits.length === 0 ? 0 : (activeOption + 1) % hits.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(hits.length === 0 ? 0 : (activeOption - 1 + hits.length) % hits.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectAt(activeOption)
    }
  }

  const hasQuery = term.trim().length > 0

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTerm('')
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 grid place-items-start bg-slate-950/80 p-4 pt-[12vh] backdrop-blur-sm motion-safe:animate-modal-fade">
          <Dialog.Content
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              inputRef.current?.focus()
            }}
            aria-label="사이트 검색"
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-stone-700 bg-raised shadow-2xl motion-safe:animate-modal-pop"
          >
            <div className="flex items-center gap-2.5 border-b border-stone-800 px-4">
              <Search className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={hits.length > 0 ? `${listboxId}-${activeOption}` : undefined}
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onListKeyDown}
                placeholder="프로젝트, 메이커, 소식 검색…"
                className="min-h-12 w-full bg-transparent py-3 text-sm text-stone-100 outline-none placeholder:text-stone-400"
              />
              <kbd className="hidden shrink-0 rounded border border-stone-700 px-1.5 py-0.5 text-[10px] font-bold text-stone-400 sm:block">
                Esc
              </kbd>
            </div>

            <Dialog.Title className="sr-only">사이트 검색</Dialog.Title>
            <Dialog.Description className="sr-only">
              결과를 위아래 화살표로 이동하고 Enter 로 엽니다.
            </Dialog.Description>

            <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
              {!hasQuery ? (
                <p className="px-3 py-8 text-center text-sm text-stone-400">
                  검색어를 입력하면 결과가 여기에 표시됩니다.
                </p>
              ) : query.isPending ? (
                <p className="px-3 py-8 text-center text-sm text-stone-400" aria-busy>
                  검색 중…
                </p>
              ) : query.isError ? (
                <p className="px-3 py-8 text-center text-sm text-red-200" role="alert">
                  검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
                </p>
              ) : hits.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-stone-400">
                  “{term.trim()}”에 대한 결과가 없습니다.
                </p>
              ) : (
                <ul role="listbox" id={listboxId} aria-label="검색 결과">
                  {hits.map((hit, index) => {
                    const active = index === activeOption
                    return (
                      <li
                        key={hit.id}
                        id={`${listboxId}-${index}`}
                        role="option"
                        aria-selected={active}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectAt(index)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                            active ? 'bg-cyan-300/10' : 'hover:bg-stone-900/60'
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-stone-100">
                              {stripHighlight(hit.titleHighlight) || hit.title}
                            </span>
                            {hit.snippet ? (
                              <span className="mt-0.5 block truncate text-xs text-stone-300">
                                {stripHighlight(hit.snippet)}
                              </span>
                            ) : null}
                          </span>
                          {hit.category ? (
                            <span className="shrink-0 rounded-full border border-stone-700 px-2 py-0.5 text-[10px] font-bold text-stone-400">
                              {hit.category}
                            </span>
                          ) : null}
                          {active ? (
                            <CornerDownLeft
                              className="h-3.5 w-3.5 shrink-0 text-cyan-200"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
