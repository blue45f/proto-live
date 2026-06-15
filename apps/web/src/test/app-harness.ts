import { makeApiMock } from './api-mock'

// App 통합 테스트 공유 하네스. 여러 특성화(characterization) 스위트가 같은
// mock 리셋/라우트 설정 스캐폴딩을 복붙해 쓰던 것을 한 곳으로 모은다.
// (vi.mock 자체는 파일별로 호이스팅돼야 하므로 각 테스트 상단에 그대로 둔다.)

const mockApi = makeApiMock()

/** history.pushState 로 시작 경로를 세팅한다. */
export function setPath(path: string) {
  globalThis.history.pushState({}, '', path)
}

/** 매 테스트 전 깨끗한 시장 라우트 + 로그아웃 세션 + mock 호출기록 초기화. */
export function resetAppHarness() {
  setPath('/')
  localStorage.clear()
  Object.values(mockApi).forEach((fn) => fn.mockClear())
}

/** 매 테스트 후 루트 경로로 되돌린다(전역 stub 해제는 호출부에서 필요 시 추가). */
export function restoreAppHarness() {
  globalThis.history.pushState({}, '', '/')
}
