"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
};

type State = {
  error: Error | null;
};

export default class AlertErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    const { label, children } = this.props;

    if (error) {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-400">
            {label ?? "Panel"} — render error
          </p>
          <p className="mt-2 break-all font-mono text-xs text-red-300">
            {error.message || String(error)}
          </p>
          {error.stack && (
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-red-300/60">
              {error.stack}
            </pre>
          )}
        </div>
      );
    }

    return children;
  }
}
