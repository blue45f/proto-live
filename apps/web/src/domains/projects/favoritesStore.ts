import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

const FAVORITES_STORAGE_KEY = 'protolive:favorites'

export interface FavoritesState {
  favoriteProjectIds: Set<number>
  toggleFavorite: (projectId: number) => void
}

/**
 * 즐겨찾기 클라이언트 UI 스토어(zustand). 기존 useFavorites 도메인 훅의 상태/토글/영속을
 * 그대로 이전한다. 영속 포맷은 종전과 동일하게 `protolive:favorites` 키에 순수 number[]
 * 배열로 직렬화한다(zustand 기본 { state, version } 래퍼를 쓰지 않아 탭/세션 호환 보존).
 * 동작은 기존과 동일(특성화 테스트로 고정).
 */
const arrayStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      const raw = localStorage.getItem(name)
      if (!raw) {
        return null
      }
      const parsed = JSON.parse(raw)
      const ids = Array.isArray(parsed) ? parsed : []
      return JSON.stringify({ state: { favoriteProjectIds: ids } })
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      const parsed = JSON.parse(value) as { state?: { favoriteProjectIds?: number[] } }
      const ids = parsed.state?.favoriteProjectIds ?? []
      localStorage.setItem(name, JSON.stringify(ids))
    } catch {
      /* 영속 실패는 무시(런타임 상태는 그대로 유지) */
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      localStorage.removeItem(name)
    } catch {
      /* 무시 */
    }
  },
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteProjectIds: new Set<number>(),
      toggleFavorite: (projectId) => {
        const next = new Set(get().favoriteProjectIds)
        if (next.has(projectId)) {
          next.delete(projectId)
        } else {
          next.add(projectId)
        }
        set({ favoriteProjectIds: next })
      },
    }),
    {
      name: FAVORITES_STORAGE_KEY,
      storage: createJSONStorage(() => arrayStorage),
      partialize: (state) => ({
        favoriteProjectIds: Array.from(state.favoriteProjectIds) as unknown as Set<number>,
      }),
      merge: (persisted, current) => {
        const incoming = (persisted as { favoriteProjectIds?: number[] } | undefined)
          ?.favoriteProjectIds
        return {
          ...current,
          favoriteProjectIds: new Set(Array.isArray(incoming) ? incoming : []),
        }
      },
    }
  )
)
