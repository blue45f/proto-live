import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { useFavoritesStore } from '../domains/projects/favoritesStore'
import { useReviewComposerStore } from '../domains/projects/reviewComposerStore'
import { useUpvotedProjectsStore } from '../domains/projects/upvotedProjectsStore'
import { useToastStore } from '../state/stores/toastStore'

// zustand 스토어는 모듈 싱글턴이라 테스트 간에 상태가 남는다(useState 훅은 매 마운트마다
// 초기화됐던 것과 다름). 각 클라이언트 UI 스토어의 초기 상태를 캡처해 매 테스트 후 되돌려,
// localStorage.clear()/api mockClear 와 동일한 격리를 보장한다.
const initialFavoritesState = useFavoritesStore.getState()
const initialUpvotedState = useUpvotedProjectsStore.getState()
const initialReviewComposerState = useReviewComposerStore.getState()
const initialToastState = useToastStore.getState()

function resetStores() {
  useFavoritesStore.setState(initialFavoritesState, true)
  useUpvotedProjectsStore.setState(initialUpvotedState, true)
  useReviewComposerStore.setState(initialReviewComposerState, true)
  useToastStore.setState(initialToastState, true)
}

// React Testing Library unmounts everything after each test so the hand-rolled
// history/popstate listeners and polling intervals in App.tsx are torn down and
// do not leak between characterization tests.
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  resetStores()
})

// jsdom does not implement scrollTo; App.tsx calls window.scrollTo on every
// route change (openProjectDetail / closeProjectDetail). Stub it so navigation
// behavior can be exercised without unhandled errors.
if (!window.scrollTo) {
  ;(window as unknown as { scrollTo: () => void }).scrollTo = () => {}
} else {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
}

// jsdom lacks matchMedia; guard in case any dependency probes it.
if (!window.matchMedia) {
  ;(window as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}
