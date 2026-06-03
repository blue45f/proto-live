import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

/**
 * 앱 최상위 에러 바운더리. 렌더 중 throw 되는 예외를 잡아 빈 화면 대신
 * 복구 가능한 폴백(다시 시도 / 새로고침)을 보여준다. 에러 바운더리는
 * 클래스 컴포넌트로만 구현 가능해 여기만 예외적으로 클래스를 쓴다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 운영에서는 모니터링으로 전송할 지점. 지금은 콘솔로 남겨 디버깅을 돕는다.
    console.error('Unhandled render error:', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main
          role="alert"
          className="grid min-h-screen place-items-center bg-[oklch(14%_0.018_205)] px-6 text-stone-100"
        >
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-black text-stone-50">화면을 표시하지 못했습니다</h1>
            <p className="mt-3 text-stone-400">
              예상치 못한 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950"
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-cyan-900/40 px-4 py-2 font-bold text-stone-200"
              >
                새로고침
              </button>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
