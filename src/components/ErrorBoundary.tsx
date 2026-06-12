import { Component, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // 문제 신고 시 원인 추적용
    console.error('[가오레] 화면 오류:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <div className="error-screen__emoji">😵</div>
          <div className="error-screen__title">앗! 문제가 생겼어요</div>
          <p className="error-screen__desc">
            걱정 마세요, 디스크는 안전하게 저장되어 있어요.
          </p>
          <button
            type="button"
            className="big-btn"
            onClick={() => window.location.reload()}
          >
            다시 시작하기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
