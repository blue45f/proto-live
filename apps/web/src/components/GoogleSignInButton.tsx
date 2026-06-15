import { useEffect, useRef } from 'react'

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (cfg: {
        client_id: string
        callback: (resp: { credential: string }) => void
      }) => void
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
    }
  }
}
declare global {
  interface Window {
    google?: { accounts?: GoogleIdApi['accounts'] }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'
let gisPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (globalThis.google?.accounts?.id) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('GIS 스크립트 로드 실패'))
    document.head.appendChild(s)
  })
  return gisPromise
}

/** "Google로 계속하기" 버튼 — credential(ID 토큰)을 onCredential 로 넘김. */
export function GoogleSignInButton({
  clientId,
  onCredential,
  text = 'continue_with',
}: {
  clientId: string
  onCredential: (credential: string) => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cbRef = useRef(onCredential)
  useEffect(() => {
    cbRef.current = onCredential
  })

  useEffect(() => {
    let cancelled = false
    void loadGis().then(() => {
      if (cancelled || !ref.current || !globalThis.google?.accounts?.id) return
      globalThis.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => cbRef.current(resp.credential),
      })
      ref.current.innerHTML = ''
      globalThis.google.accounts.id.renderButton(ref.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text,
        shape: 'rectangular',
        logo_alignment: 'center',
        width: 280,
      })
    })
    return () => {
      cancelled = true
    }
  }, [clientId, text])

  return <div ref={ref} className="flex justify-center" />
}
