import { TERMSDESK_BASE_URL, TERMSDESK_ORG_SLUG, TERMSDESK_SUPPORT_URL } from './termsdesk'

/**
 * TermsDesk 중앙 문의(Inquiry) 연동 — 인앱 문의 폼의 접수 백엔드.
 * 공개 게시판(support board)과 달리 본문·연락처가 외부에 노출되지 않는 비공개 접수이며,
 * POST /api/public/:siteSlug/inquiries 한 번으로 끝나는 무인증 공개 API다.
 * 폼 계약(카테고리 5종, 제목 2..140, 본문 10..4000, 허니팟 website)은 서버 zod 스키마와 동일하다.
 */

export const INQUIRY_ENDPOINT = `${TERMSDESK_BASE_URL}/api/public/${TERMSDESK_ORG_SLUG}/inquiries`

/** 접수 실패 시 폴백으로 안내하는 외부 지원 보드(기존 링크 유지). */
export const INQUIRY_FALLBACK_URL = TERMSDESK_SUPPORT_URL

export const INQUIRY_CATEGORIES = ['contact', 'partnership', 'bug', 'qa', 'question'] as const
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number]

export const inquiryCategoryCopy: Record<InquiryCategory, { label: string; helper: string }> = {
  contact: { label: '일반 문의', helper: '서비스 이용, 계정, 기타 문의' },
  partnership: { label: '제휴 제안', helper: '협업, 투자 연계, 비즈니스 제안' },
  bug: { label: '버그 신고', helper: '오류 화면, 동작 문제 제보' },
  qa: { label: '품질 피드백', helper: '불편한 흐름, 개선 제안' },
  question: { label: '사용 질문', helper: '기능 사용법, 정책 질문' },
}

export const INQUIRY_TITLE_MIN = 2
export const INQUIRY_TITLE_MAX = 140
export const INQUIRY_BODY_MIN = 10
export const INQUIRY_BODY_MAX = 4000

export interface InquiryFormInput {
  category: InquiryCategory
  title: string
  body: string
  contactEmail?: string
  /** 허니팟 — 사람에게 보이지 않는 숨김 필드. 봇이 채우면 서버가 조용히 폐기한다. */
  website?: string
}

export interface InquiryPayload extends InquiryFormInput {
  originUrl: string
}

/** 접수 영수증 — 서버는 본문/연락처를 절대 되돌려주지 않는다(id·분류·상태·시각만). */
export interface InquiryReceipt {
  id: string
  siteSlug: string
  category: InquiryCategory
  status: 'new' | 'in_progress' | 'closed'
  createdAt: string
}

/** 제출 전 클라이언트 검증 — 서버 zod 와 같은 경계. 통과 시 null, 실패 시 한국어 메시지. */
export function validateInquiryInput(input: InquiryFormInput): string | null {
  if (!INQUIRY_CATEGORIES.includes(input.category)) {
    return '문의 유형을 선택해주세요.'
  }
  const title = input.title.trim()
  if (title.length < INQUIRY_TITLE_MIN || title.length > INQUIRY_TITLE_MAX) {
    return `제목은 ${INQUIRY_TITLE_MIN}자 이상 ${INQUIRY_TITLE_MAX}자 이하로 입력해주세요.`
  }
  const body = input.body.trim()
  if (body.length < INQUIRY_BODY_MIN || body.length > INQUIRY_BODY_MAX) {
    return `내용은 ${INQUIRY_BODY_MIN}자 이상 ${INQUIRY_BODY_MAX}자 이하로 입력해주세요.`
  }
  const contactEmail = input.contactEmail?.trim() ?? ''
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return '회신 이메일 형식이 올바르지 않습니다.'
  }
  return null
}

/** 전송 페이로드 구성 — 공백 트리밍, 빈 선택 필드 제거, originUrl 자동 첨부. */
export function buildInquiryPayload(input: InquiryFormInput, originUrl: string): InquiryPayload {
  const contactEmail = input.contactEmail?.trim()
  return {
    category: input.category,
    title: input.title.trim(),
    body: input.body.trim(),
    ...(contactEmail ? { contactEmail } : {}),
    // 허니팟은 항상 보낸다(빈 문자열 = 사람). 봇이 채운 값도 그대로 전달해 서버가 폐기한다.
    website: input.website ?? '',
    originUrl: originUrl.slice(0, 500),
  }
}

/** TermsDesk 오류 응답(message: string | string[])에서 사용자 메시지를 추출한다. */
export function extractInquiryErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const raw = (payload as { message?: string | string[] }).message
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.join(' ')
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw
    }
  }
  return fallback
}

/**
 * 문의 접수. 성공 시 영수증을 돌려주고, 실패(검증 오류·429 스로틀·네트워크)는
 * 한국어 메시지와 함께 throw 한다 — 폼이 폴백(외부 지원 보드) 안내로 전환할 수 있게.
 */
export async function createInquiry(
  input: InquiryFormInput,
  originUrl: string,
  signal?: AbortSignal
): Promise<InquiryReceipt> {
  const payload = buildInquiryPayload(input, originUrl)
  let response: Response
  try {
    response = await fetch(INQUIRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    // @ts-expect-error - Error cause requires ES2022 target
    throw new Error('문의 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.', { cause: error })
  }

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      // 본문 없는 오류(예: 게이트웨이)는 상태 코드 기반 기본 메시지로 처리한다.
    }
    if (response.status === 429) {
      throw new Error('요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.')
    }
    throw new Error(
      extractInquiryErrorMessage(body, `문의 접수에 실패했습니다. (HTTP ${response.status})`)
    )
  }

  return (await response.json()) as InquiryReceipt
}
