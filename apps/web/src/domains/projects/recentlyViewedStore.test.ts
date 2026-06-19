import { beforeEach, describe, expect, it } from 'vitest'

import {
  RECENTLY_VIEWED_LIMIT,
  type RecentlyViewedEntry,
  useRecentlyViewedStore,
} from './recentlyViewedStore'

function entry(id: number): RecentlyViewedEntry {
  return { id, title: `사이트 ${id}`, category: '생산성' }
}

function ids(): number[] {
  return useRecentlyViewedStore.getState().recentlyViewed.map((item) => item.id)
}

describe('recentlyViewedStore', () => {
  beforeEach(() => {
    useRecentlyViewedStore.getState().clearRecentlyViewed()
    localStorage.clear()
  })

  it('puts the most recently viewed project first', () => {
    const { recordView } = useRecentlyViewedStore.getState()
    recordView(entry(1))
    recordView(entry(2))
    expect(ids()).toEqual([2, 1])
  })

  it('dedupes by id and re-promotes a re-viewed project to the front', () => {
    const { recordView } = useRecentlyViewedStore.getState()
    recordView(entry(1))
    recordView(entry(2))
    recordView(entry(1))
    expect(ids()).toEqual([1, 2])
  })

  it(`caps the history at ${RECENTLY_VIEWED_LIMIT} entries, dropping the oldest`, () => {
    const { recordView } = useRecentlyViewedStore.getState()
    for (let id = 1; id <= RECENTLY_VIEWED_LIMIT + 3; id += 1) {
      recordView(entry(id))
    }
    const result = ids()
    expect(result).toHaveLength(RECENTLY_VIEWED_LIMIT)
    expect(result[0]).toBe(RECENTLY_VIEWED_LIMIT + 3)
    expect(result).not.toContain(1)
  })

  it('removes a single entry without disturbing the rest', () => {
    const { recordView, removeView } = useRecentlyViewedStore.getState()
    recordView(entry(1))
    recordView(entry(2))
    recordView(entry(3))
    removeView(2)
    expect(ids()).toEqual([3, 1])
  })

  it('clears the whole history', () => {
    const { recordView, clearRecentlyViewed } = useRecentlyViewedStore.getState()
    recordView(entry(1))
    clearRecentlyViewed()
    expect(ids()).toEqual([])
  })
})
