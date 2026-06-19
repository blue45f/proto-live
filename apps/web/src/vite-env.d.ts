/// <reference types="vite/client" />

/**
 * 앱에서 읽는 Vite 환경 변수 타입. DeskCloud 네이티브 연동은 각 desk 의 URL/PK 가
 * 설정된 환경에서만 활성화되며(미설정=비활성, 가역적), publishable 키(`pk_`)만
 * 브라우저에 노출한다(secret `sk_` 는 절대 클라이언트에 두지 않는다).
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string

  // desk-platform 공개 문의 게시판 REST 베이스 URL(미설정 시 라이브 기본값).
  // 로컬 개발 시에만 desk-platform api(:6090) 등으로 오버라이드한다.
  readonly VITE_DESK_PLATFORM_URL?: string

  // DeskCloud 공개(pk_) SDK 엔드포인트 + publishable 키(선택, 미설정 시 'pk_demo').
  readonly VITE_SURVEYDESK_URL?: string
  readonly VITE_SURVEYDESK_PK?: string
  readonly VITE_CHANGELOGDESK_URL?: string
  readonly VITE_CHANGELOGDESK_PK?: string
  readonly VITE_REVIEWDESK_URL?: string
  readonly VITE_REVIEWDESK_PK?: string
  readonly VITE_NOTIFYDESK_URL?: string
  readonly VITE_NOTIFYDESK_PK?: string
  readonly VITE_SEARCHDESK_URL?: string
  readonly VITE_SEARCHDESK_PK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
