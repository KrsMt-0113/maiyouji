import React from 'react';
import { Compass } from 'lucide-react';
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="boot-screen">
        <Compass size={40} />
        <h1>这次旅程卡了一下</h1>
        <p>请刷新页面重新打开，个人记录仍保存在本机。</p>
        <button className="button primary" onClick={() => location.reload()}>
          重新打开
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
