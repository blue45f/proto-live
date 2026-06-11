/**
 * 토론/댓글 이미지 첨부 전처리 — 의존성 없이 캔버스로 리사이즈/재인코딩한다.
 * 계약(서버와 동일): 최장변 1600px, 인코딩 결과 2MB 이하, PNG/JPEG/WebP 입력만.
 */

export const ATTACHMENT_MAX_EDGE_PX = 1600
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024
export const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp'

export interface PreparedAttachment {
  dataUrl: string
  byteSize: number
  width: number
  height: number
}

/** data URL(base64) 디코드 바이트 수 — 패딩 보정 포함(서버 추정식과 동일). */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',')
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

/** 최장변 기준 축소 치수 계산(확대는 하지 않는다). */
export function fitWithinMaxEdge(
  width: number,
  height: number,
  maxEdge = ATTACHMENT_MAX_EDGE_PX
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) {
    return { width, height }
  }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * 파일 → 첨부 data URL. 1600px로 줄여 JPEG(q=0.82)로 인코딩하고, 그래도 2MB를 넘으면
 * q=0.6 으로 한 번 더 시도한 뒤 실패 시 사용자 메시지와 함께 throw 한다.
 */
export async function prepareImageAttachment(file: File): Promise<PreparedAttachment> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new Error('PNG, JPEG, WebP 이미지만 첨부할 수 있습니다.')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const { width, height } = fitWithinMaxEdge(image.naturalWidth, image.naturalHeight)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('이 브라우저에서는 이미지 첨부를 처리할 수 없습니다.')
    }
    // 투명 PNG 가 JPEG 로 변환될 때 검정 배경이 되지 않도록 흰 배경을 깐다.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    for (const quality of [0.82, 0.6]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      const byteSize = estimateDataUrlBytes(dataUrl)
      if (byteSize <= ATTACHMENT_MAX_BYTES) {
        return { dataUrl, byteSize, width, height }
      }
    }
    throw new Error('이미지가 너무 큽니다. 2MB 이하로 줄여 다시 시도해주세요.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 읽을 수 없습니다. 다른 파일을 선택해주세요.'))
    image.src = src
  })
}
