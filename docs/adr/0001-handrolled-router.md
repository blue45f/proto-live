# ADR 0001: 핸드롤 라우터 (react-router 미도입)

- 상태: 채택
- 일자: 2026-06-04
- 맥락: 커뮤니티 피벗으로 라우트가 늘어난다(`/` 피드, `/projects/:id` 상세, `/admin`,
  이후 `/submit`·`/invest`·`/makers/:handle`). 기존엔 view 토글 + `window.history`
  직접 조작 + `storage.ts`의 `readInitial*`로 흩어져 있었다.

## 결정

`apps/web/src/router/route.ts`에 라우트 해석(`matchRoute`)과 내비게이션(`navigate`,
`routePath`)을 모은 **핸드롤 라우터**를 둔다. react-router 등 라우팅 라이브러리는
도입하지 않는다.

## 근거

- 보일러플레이트 런타임 의존성은 react/axios/lucide만이다. native-first·라이브러리
  강제 금지 원칙상 라우팅 한 가지를 위해 의존성을 늘리지 않는다.
- 라우트가 4개 수준이고 중첩 라우트/로더/데이터 라우터가 필요 없다. URL→상태 매핑과
  `pushState` 래핑이면 충분하다.
- 기존 동작(특성화 테스트 4건: `/`, `/projects/:id`, `/admin`, popstate)을 그대로
  보존하며 추출만 한다.

## 트레이드오프 / 비범위

- 스크롤 복원, 라우트 기반 코드 스플리팅, 중첩 라우트는 **현재 비범위**다. 필요해지면
  그때 react-router 도입을 재검토한다(이 ADR을 갱신).
- 라우트가 늘면 `matchRoute`의 분기가 길어질 수 있다. 임계가 오면 테이블 기반 매처로
  리팩토링한다.
