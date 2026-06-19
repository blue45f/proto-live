import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const RECENTLY_VIEWED_STORAGE_KEY = 'protolive:recently-viewed:v1'

/** 사이드바 "최근 본 사이트" 레일에 띄울 최대 항목 수. */
export const RECENTLY_VIEWED_LIMIT = 6

/** 레일 렌더에 필요한 최소 스냅샷(전체 Project를 들고 있지 않아 stale 위험을 줄인다). */
export interface RecentlyViewedEntry {
  id: number
  title: string
  category: string
}

export interface RecentlyViewedState {
  recentlyViewed: RecentlyViewedEntry[]
  /** 상세 진입 시 호출. 맨 앞으로 끌어올리고 중복 제거 후 LIMIT 만큼만 남긴다. */
  recordView: (entry: RecentlyViewedEntry) => void
  /** 단일 항목 제거(레일의 X 버튼). */
  removeView: (projectId: number) => void
  /** 전체 비우기. */
  clearRecentlyViewed: () => void
}

/**
 * "최근 본 사이트" 클라이언트 UI 스토어(zustand + persist). 투자자가 피드에서 여러
 * 프로젝트를 열어보다 직전에 본 항목으로 빠르게 되돌아갈 수 있도록 상세 진입 이력을
 * 최신순으로 보관한다. 즐겨찾기 스토어와 같은 영속 패턴을 따르되, 표준 zustand
 * { state, version } 래퍼로 직렬화한다(이 키는 신규라 호환 부담 없음).
 */
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      recentlyViewed: [],
      recordView: (entry) => {
        const deduped = get().recentlyViewed.filter((item) => item.id !== entry.id)
        set({ recentlyViewed: [entry, ...deduped].slice(0, RECENTLY_VIEWED_LIMIT) })
      },
      removeView: (projectId) => {
        set({ recentlyViewed: get().recentlyViewed.filter((item) => item.id !== projectId) })
      },
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),
    }),
    {
      name: RECENTLY_VIEWED_STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          }
        }
        return localStorage
      }),
      partialize: (state) => ({ recentlyViewed: state.recentlyViewed }),
    }
  )
)
