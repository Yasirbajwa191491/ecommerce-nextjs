import { Component, type ErrorInfo, type ReactNode } from "react";

import { GlobalErrorView } from "@/components/feedback/GlobalErrorView";
import { logAppError } from "@/lib/errors";

type AppErrorBoundaryProps = {
  children: ReactNode;
  segment?: string;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logAppError(error, {
      segment: this.props.segment ?? "boundary",
      digest: info.componentStack ?? undefined,
    });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <GlobalErrorView
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
