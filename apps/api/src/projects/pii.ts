/**
 * 개인정보(PII) 마스킹 헬퍼.
 * 공개 API 응답에 원본 이메일이 새지 않도록 서버에서 마스킹한다.
 * 프론트엔드 lib/format.ts 의 maskEmail 과 동일 규칙을 유지해 이중 마스킹해도 결과가 같다(멱등).
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [name, domain] = email.split('@')
  if (!domain) return email
  const safeName = name.length <= 2 ? `${name[0] ?? '*'}*` : `${name.slice(0, 2)}***`
  return `${safeName}@${domain}`
}
