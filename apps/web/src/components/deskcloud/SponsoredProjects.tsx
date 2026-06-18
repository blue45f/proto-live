/**
 * SponsoredProjects — 네이티브 AdDesk "추천(Sponsored)" 레일 (마켓).
 * ──────────────────────────────────────────────────────────────────────────
 * 스택: Tailwind(앱 stone/lime 팔레트) + Embla(모바일 스와이프) + Radix Tooltip(스폰서
 * 디스클로저) + lucide. 라이브 AdDesk(공개 SDK `createAdClient`, pk_)에서 슬롯별
 * 크리에이티브를 받아 ProtoLive 자체 토큰으로 렌더하고, 노출(카드 50% 노출 시 1회)·
 * 클릭을 추적한다. 외부 위젯/iframe 없음.
 *
 * env-gate + 가역: VITE_ADDESK_URL 미설정이거나 활성 크리에이티브 0건이면 아무것도
 * 렌더하지 않는다(빈 박스 없음). 마켓 피드 상단 슬롯 1개 — 복잡도 낮음.
 */
import { type ServeResult } from '@heejun/deskcloud'
import * as Tooltip from '@radix-ui/react-tooltip'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowUpRight, Info } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { adSlots, getAdClient } from '../../lib/deskcloud'

type Creative = ServeResult & { creativeId: string; imageUrl: string }

export function SponsoredProjects() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const tracked = useRef<Set<string>>(new Set())

  useEffect(() => {
    const client = getAdClient()
    if (!client || adSlots.length === 0) return
    const ctrl = new AbortController()
    let cancelled = false
    Promise.allSettled(adSlots.map((slot) => client.serve({ slot, signal: ctrl.signal }))).then(
      (settled) => {
        if (cancelled) return
        const seen = new Set<string>()
        const next: Creative[] = []
        for (const r of settled) {
          if (r.status !== 'fulfilled') continue
          const ad = r.value
          if (ad.served && ad.creativeId && ad.imageUrl && !seen.has(ad.creativeId)) {
            seen.add(ad.creativeId)
            next.push(ad as Creative)
          }
        }
        setCreatives(next)
      }
    )
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const onImpression = useCallback((id: string) => {
    if (tracked.current.has(id)) return
    tracked.current.add(id)
    void getAdClient()
      ?.trackImpression(id)
      .catch(() => {})
  }, [])

  const onClick = useCallback((id: string) => {
    void getAdClient()
      ?.trackClick(id)
      .catch(() => {})
  }, [])

  if (creatives.length === 0) return null

  return (
    <section aria-label="추천 프로젝트 (스폰서)" className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-lime-300">추천</span>
        <h2 className="text-lg font-black text-stone-50">스폰서 프로젝트</h2>
        <SponsorDisclosure />
      </div>
      <AdCarousel creatives={creatives} onImpression={onImpression} onClick={onClick} />
    </section>
  )
}

function SponsorDisclosure() {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label="스폰서 안내"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-stone-400 outline-none transition-colors hover:text-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            <Info size={14} aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-[220px] rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-[12.5px] leading-relaxed text-stone-300 shadow-xl"
          >
            이 영역은 스폰서가 후원한 추천입니다. 노출·클릭은 광고 성과 측정에만 쓰입니다.
            <Tooltip.Arrow className="fill-stone-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

function AdCarousel({
  creatives,
  onImpression,
  onClick,
}: {
  creatives: Creative[]
  onImpression: (id: string) => void
  onClick: (id: string) => void
}) {
  const many = creatives.length > 1
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    containScroll: 'trimSnaps',
    active: many,
  })
  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])

  useEffect(() => {
    if (!emblaApi) return
    const update = () => {
      setSnaps(emblaApi.scrollSnapList())
      setSelected(emblaApi.selectedScrollSnap())
    }
    emblaApi.on('select', update).on('reInit', update)
    const raf = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(raf)
      emblaApi.off('select', update).off('reInit', update)
    }
  }, [emblaApi])

  return (
    <div>
      <div className="overflow-hidden" ref={emblaRef}>
        <ul className="m-0 flex list-none gap-4 p-0">
          {creatives.map((c) => (
            <li
              key={c.creativeId}
              className="min-w-0 basis-[86%] sm:basis-[56%] lg:basis-[calc(33.333%-0.667rem)]"
              style={{ flex: '0 0 auto' }}
            >
              <AdCard creative={c} onImpression={onImpression} onClick={onClick} />
            </li>
          ))}
        </ul>
      </div>

      {many && snaps.length > 1 && (
        <div
          className="mt-4 flex justify-center gap-1.5"
          role="tablist"
          aria-label="추천 프로젝트 페이지"
        >
          {snaps.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-current={i === selected ? 'true' : undefined}
              aria-label={`${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={
                'h-1.5 rounded-full transition-all ' +
                (i === selected ? 'w-[18px] bg-stone-50' : 'w-1.5 bg-stone-600')
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AdCard({
  creative,
  onImpression,
  onClick,
}: {
  creative: Creative
  onImpression: (id: string) => void
  onClick: (id: string) => void
}) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const { creativeId } = creative

  useEffect(() => {
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      onImpression(creativeId)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            onImpression(creativeId)
            io.disconnect()
          }
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [el, creativeId, onImpression])

  const cardClass =
    'group relative block aspect-[16/9] overflow-hidden rounded-2xl border border-stone-700/50 bg-stone-900/40 transition hover:-translate-y-0.5 hover:border-stone-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

  const inner = (
    <>
      <img
        className="h-full w-full object-cover"
        src={creative.imageUrl}
        alt={creative.alt ?? ''}
        loading="lazy"
        decoding="async"
      />
      <span className="absolute left-2.5 top-2.5 rounded-full bg-lime-300/15 px-2 py-0.5 text-[10.5px] font-black tracking-[0.12em] text-lime-200">
        AD
      </span>
      {creative.linkUrl && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex translate-y-1 items-center gap-1 rounded-full bg-stone-900/90 px-2.5 py-1 text-[12.5px] font-bold text-stone-50 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
          보러가기 <ArrowUpRight size={14} aria-hidden />
        </span>
      )}
    </>
  )

  if (creative.linkUrl) {
    return (
      <a
        ref={setEl}
        className={cardClass}
        href={creative.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => onClick(creativeId)}
      >
        {inner}
      </a>
    )
  }
  return (
    <div ref={setEl} className={cardClass}>
      {inner}
    </div>
  )
}
