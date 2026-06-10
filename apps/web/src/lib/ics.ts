/**
 * RFC 5545 호환 ICS(iCalendar) 빌더.
 *
 * 캘린더 앱(Apple Calendar, Google Calendar, Outlook 등)이 시즌 챌린지
 * 마감 일정을 가져갈 수 있도록 VCALENDAR + VEVENT 텍스트를 생성한다.
 *
 * 앱 전체에서 사용하는 단일 ICS 구현체다. (일정 내보내기는 모두 여기로 통합)
 */

export interface IcsEvent {
  /** VEVENT의 UID. 생략 시 호출부가 직접 넘긴 값이 없으므로 반드시 채워서 전달한다. */
  uid: string
  title: string
  description?: string
  location?: string
  startAt: string | Date
  endAt: string | Date
  url?: string
}

const PRODID = '-//ProtoLive//Challenge//KO'
const CRLF = '\r\n'

/**
 * Date 또는 ISO string을 RFC 5545의 `YYYYMMDDTHHMMSSZ` (UTC) 포맷으로 변환.
 */
function toUtcStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date passed to buildIcs: ${String(value)}`)
  }
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  const hh = date.getUTCHours().toString().padStart(2, '0')
  const mm = date.getUTCMinutes().toString().padStart(2, '0')
  const ss = date.getUTCSeconds().toString().padStart(2, '0')
  return `${y}${m}${d}T${hh}${mm}${ss}Z`
}

/**
 * RFC 5545 §3.3.11 TEXT escape:
 *   백슬래시, 세미콜론, 콤마, 개행 문자를 이스케이프한다.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

/**
 * RFC 5545 §3.1 Content Line folding — 75 octets 초과 시 CRLF + 공백으로 접는다.
 * 한글 같은 멀티바이트 문자를 안전하게 처리하기 위해 UTF-8 바이트 길이 기준으로 분할.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(line)
  if (bytes.length <= 75) return line

  const decoder = new TextDecoder()
  const chunks: string[] = []
  let start = 0
  while (start < bytes.length) {
    const limit = start === 0 ? 75 : 74 // 후속 라인은 선행 공백 1바이트
    let end = Math.min(start + limit, bytes.length)
    // UTF-8 멀티바이트 시퀀스 한가운데서 자르지 않도록 보정
    while (end > start && end < bytes.length && (bytes[end] & 0b1100_0000) === 0b1000_0000) {
      end -= 1
    }
    chunks.push(decoder.decode(bytes.subarray(start, end)))
    start = end
  }
  return chunks.join(`${CRLF} `)
}

/**
 * 이벤트 데이터를 RFC 5545 호환 ICS 텍스트로 변환한다.
 *
 * - VCALENDAR + VEVENT 구조
 * - DTSTART/DTEND는 UTC `YYYYMMDDTHHMMSSZ`
 * - SUMMARY, DESCRIPTION, LOCATION, URL 포함
 * - 모든 content line은 75 octet 기준으로 folding
 * - CRLF 줄 끝
 */
export function buildIcs(event: IcsEvent): string {
  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push(`PRODID:${PRODID}`)
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${event.uid}`)
  lines.push(`DTSTAMP:${toUtcStamp(new Date())}`)
  lines.push(`DTSTART:${toUtcStamp(event.startAt)}`)
  lines.push(`DTEND:${toUtcStamp(event.endAt)}`)
  lines.push(`SUMMARY:${escapeText(event.title)}`)
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`)
  }
  if (event.url) {
    lines.push(`URL:${event.url}`)
  }
  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join(CRLF) + CRLF
}

function sanitizeFilename(name: string): string {
  const slug =
    name
      .replace(/[\\/:*?"<>|]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'challenge'
  return slug.endsWith('.ics') ? slug : `${slug}.ics`
}

/**
 * 이벤트로 ICS 텍스트를 만들어 브라우저 다운로드를 트리거한다.
 * (a.download + Blob URL 트릭)
 *
 * @param event 변환할 이벤트
 * @param filename 다운로드 파일명. 생략 시 `protolive-<제목>.ics`로 자동 생성.
 */
export function downloadIcs(event: IcsEvent, filename?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const ics = buildIcs(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const finalName = filename
    ? sanitizeFilename(filename)
    : sanitizeFilename(`protolive-${event.title}`)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = finalName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // 브라우저가 다운로드를 시작할 시간을 준 뒤 URL을 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
