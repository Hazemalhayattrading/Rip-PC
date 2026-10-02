import { Component, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /**
   * What shows instead of the children once one of them throws while rendering: a lazy chunk
   * that failed to download, or a rejected promise read with `use()`. `retry` renders the
   * children again, for a cause that a second try can fix.
   */
  readonly fallback: (error: unknown, retry: () => void) => ReactNode;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
  readonly error: unknown;
}

/** Keeps a failure inside one part of the page, so the rest of the page keeps working. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error };
  }

  private readonly retry = (): void => {
    this.setState({ failed: false, error: null });
  };

  override render(): ReactNode {
    return this.state.failed
      ? this.props.fallback(this.state.error, this.retry)
      : this.props.children;
  }
}
