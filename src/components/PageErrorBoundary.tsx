import { Component, type ReactNode } from 'react';

export default class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Page failed to load:', error); }
  render() {
    if (this.state.failed) return <div role="alert" className="p-8 text-zinc-300">
      <h1 className="mb-3 text-xl font-semibold">页面暂时无法加载</h1>
      <p className="mb-4">请检查网络后重新加载。已保存的指令仍保留在数据库中。</p>
      <button className="btn-primary" onClick={() => window.location.reload()}>重新加载</button>
    </div>;
    return this.props.children;
  }
}
