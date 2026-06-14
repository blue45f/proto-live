import { useCallback, useEffect, useState } from 'react'

const FAVORITES_STORAGE_KEY = 'protolive:favorites'

function readInitialFavorites(): Set<number> {
  if (typeof window === 'undefined') {
    return new Set<number>()
  }

  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) {
      return new Set<number>()
    }

    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set<number>()
  }
}

/**
 * 즐겨찾기 도메인 훅. 거대 useProtoLiveApp에서 분리한 첫 도메인 슬라이스로,
 * 상태/토글/로컬스토리지 영속을 한곳에 모은다. 동작은 기존과 동일(특성화 테스트로 고정).
 */
export function useFavorites() {
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<Set<number>>(readInitialFavorites)

  const toggleFavorite = useCallback((projectId: number) => {
    setFavoriteProjectIds((current) => {
      const next = new Set(current)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteProjectIds)))
  }, [favoriteProjectIds])

  return { favoriteProjectIds, toggleFavorite }
}
