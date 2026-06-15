import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RouteFallback } from './components/RouteFallback'
import './index.css'

// 살아있는 디자인 시스템 가이드. 핸드롤 라우터(router/route.ts)는 앱 내부 뷰만 다루므로,
// 독립 스타일 가이드는 가장 가벼운 방식 — pathname 분기 — 으로 App 대신 마운트한다.
// React 청크에서 분리해 메인 번들을 늘리지 않는다.
const DesignSystemPage = lazy(() => import('./components/pages/DesignSystemPage'))

const isDesignRoute =
  typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/design'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isDesignRoute ? (
        <Suspense fallback={<RouteFallback />}>
          <DesignSystemPage />
        </Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>
)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
