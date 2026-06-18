/**
 * DeskCloud 네이티브 연동(공개 `pk_` SDK) — TermsDesk 패턴.
 * ──────────────────────────────────────────────────────────────────────────
 * 이 앱은 DeskCloud 의 보편(비차별) 기능을 외부 위젯 임베드가 아니라, 공개 npm SDK
 * `@heejun/deskcloud` 의 타입드 브라우저 클라이언트로 직접 호출해 가져오고, 화면은
 * 전적으로 이 앱의 컴포넌트·디자인 토큰으로 렌더한다(네이티브 룩앤필).
 *
 * 보안: 브라우저 번들에는 공개키(`pk_`) 전용 진입점(`@heejun/deskcloud`)만 쓴다.
 *   - `@heejun/deskcloud/server`(비밀키 `sk_` 전용)는 절대 import 하지 않는다.
 *   - publishable 키는 브라우저 노출이 안전하다(서버가 Origin + x-pk 로 게이팅).
 *
 * 가역성: 각 desk 는 자기 VITE_<DESK>DESK_URL 이 설정된 환경에서만 활성화된다.
 *   미설정(로컬/CI 기본)이면 연동은 비활성이고 앱의 기존 1차 기능으로 폴백한다.
 *   PK 는 VITE_<DESK>DESK_PK 가 있으면 쓰고, 없으면 'pk_demo' 로 폴백한다.
 *
 * 코어 대체 금지: CommunityDesk·ChatDesk·MediaDesk·ModerationDesk·RealtimeDesk 는
 *   이 앱에서 차별화 코어(토론 허브·쪽지함·첨부·운영 콘솔·라이브 신호)에 해당하므로
 *   네이티브 연동 대상에서 의도적으로 제외한다(아래 enabled 플래그에 없음).
 */
import {
  createAdClient,
  createChangelogClient,
  createNotifyClient,
  createReviewClient,
  createSearchClient,
  createSurveyClient,
  type AdClient,
  type ChangelogClient,
  type NotifyClient,
  type ReviewClient,
  type SearchClient,
  type SurveyClient,
} from '@heejun/deskcloud'

const env = import.meta.env

/** VITE_<DESK>DESK_PK 가 있으면 사용, 없으면 데모 키. publishable 키라 브라우저 노출 안전. */
function pk(value: string | undefined): string {
  return value && value.length > 0 ? value : 'pk_demo'
}

/** 빈 문자열/undefined 를 null 로 정규화(빌드타임 치환된 env 값 게이팅). */
function url(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null
}

/** 각 desk 의 활성 여부(해당 VITE_*_URL 설정 시에만 true). */
export const deskEnabled = {
  survey: Boolean(url(env.VITE_SURVEYDESK_URL)),
  changelog: Boolean(url(env.VITE_CHANGELOGDESK_URL)),
  review: Boolean(url(env.VITE_REVIEWDESK_URL)),
  notify: Boolean(url(env.VITE_NOTIFYDESK_URL)),
  search: Boolean(url(env.VITE_SEARCHDESK_URL)),
  ad: Boolean(url(env.VITE_ADDESK_URL)),
} as const

/**
 * SurveyDesk 공개 클라이언트 — 피드백/설문 제출. 미설정 시 null(폴백은 1차 문의 폼).
 * (참고) `@heejun/deskcloud` 의 SurveyClient 는 getActive(appId)/submit(appId, input) 을 제공한다.
 */
export function getSurveyClient(): SurveyClient | null {
  const endpoint = url(env.VITE_SURVEYDESK_URL)
  if (!endpoint) return null
  return createSurveyClient({ endpoint, publishableKey: pk(env.VITE_SURVEYDESK_PK) })
}

/** ChangelogDesk 공개 클라이언트 — 게시된 변경이력 읽기. 미설정 시 null. */
export function getChangelogClient(): ChangelogClient | null {
  const endpoint = url(env.VITE_CHANGELOGDESK_URL)
  if (!endpoint) return null
  return createChangelogClient({ endpoint, publishableKey: pk(env.VITE_CHANGELOGDESK_PK) })
}

/** ReviewDesk 공개 클라이언트 — 후기 월/집계 읽기 + 제출. 미설정 시 null. */
export function getReviewClient(): ReviewClient | null {
  const endpoint = url(env.VITE_REVIEWDESK_URL)
  if (!endpoint) return null
  return createReviewClient({ endpoint, publishableKey: pk(env.VITE_REVIEWDESK_PK) })
}

/** AdDesk 클라이언트(추천·스폰서 프로젝트 배너) — URL env 미설정이면 null. */
export function getAdClient(): AdClient | null {
  const endpoint = url(env.VITE_ADDESK_URL)
  if (!endpoint) return null
  return createAdClient({ endpoint, publishableKey: pk(env.VITE_ADDESK_PK) })
}

/**
 * 마켓 "추천(Sponsored)" 레일이 서빙하는 슬롯 키들(슬롯당 1 크리에이티브).
 * VITE_ADDESK_SLOTS(콤마 구분)로 배포별 오버라이드. 활성 크리에이티브를 반환하는
 * 슬롯만 렌더되므로, 미설정 슬롯(과 AdDesk OFF 전체)은 보이지 않는다.
 */
export const adSlots: string[] = (
  env.VITE_ADDESK_SLOTS ?? 'market-spotlight-1,market-spotlight-2,market-spotlight-3'
)
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

/** NotifyDesk 공개 클라이언트 — 수신자 인박스 읽기 + 읽음 처리. 미설정 시 null. */
export function getNotifyClient(): NotifyClient | null {
  const endpoint = url(env.VITE_NOTIFYDESK_URL)
  if (!endpoint) return null
  return createNotifyClient({ endpoint, publishableKey: pk(env.VITE_NOTIFYDESK_PK) })
}

/** SearchDesk 공개 클라이언트 — 전문 검색 질의. 미설정 시 null. */
export function getSearchClient(): SearchClient | null {
  const endpoint = url(env.VITE_SEARCHDESK_URL)
  if (!endpoint) return null
  return createSearchClient({ endpoint, publishableKey: pk(env.VITE_SEARCHDESK_PK) })
}

/** ReviewDesk 의 후기 대상(subject) — 이 앱(서비스) 전체 후기 월에 쓰는 고정 키. */
export const REVIEW_SUBJECT_ID = 'protolive'
export const REVIEW_SUBJECT_LABEL = 'ProtoLive'

/** SurveyDesk 에 보내는 앱 식별자. */
export const SURVEY_APP_ID = 'protolive'
