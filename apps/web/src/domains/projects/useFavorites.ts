import { useShallow } from 'zustand/react/shallow'

import { useFavoritesStore } from './favoritesStore'

/**
 * 즐겨찾기 도메인 훅. 상태는 zustand 스토어(favoritesStore)로 이전됐고, 이 훅은 종전
 * 호출 계약({ favoriteProjectIds, toggleFavorite })을 그대로 보존하는 얇은 어댑터다.
 * 동작은 기존과 동일(특성화 테스트로 고정).
 */
export function useFavorites() {
  return useFavoritesStore(
    useShallow((state) => ({
      favoriteProjectIds: state.favoriteProjectIds,
      toggleFavorite: state.toggleFavorite,
    }))
  )
}
