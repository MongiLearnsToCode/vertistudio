import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void window.api
      ?.logSend({
        level: 'error',
        module: 'ErrorBoundary',
        message: 'Renderer crashed (caught by ErrorBoundary)',
        error: { name: error.name, message: error.message, stack: error.stack },
        context: { componentStack: info.componentStack ?? null },
      })
      .catch((err: unknown) => {
        console.error('[ErrorBoundary] logSend failed', err);
      });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center h-screen w-screen bg-app-base text-text-primary p-6"
      >
        <div className="max-w-md w-full">
          <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
          <p className="text-text-secondary mb-4" style={{ fontSize: 13 }}>
            The app hit an unexpected error. Details have been written to the log.
          </p>

          <details className="mb-4 text-text-secondary" style={{ fontSize: 12 }}>
            <summary className="cursor-pointer select-none">Show error details</summary>
            <pre className="mt-2 p-2 bg-app-hover rounded overflow-auto whitespace-pre-wrap"
                 style={{ maxHeight: 192, fontSize: 11 }}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-[6px] cursor-pointer transition-colors duration-150 px-[10px] py-[4px] bg-accent text-white border-none hover:opacity-90"
              style={{ fontSize: 11 }}
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-[6px] cursor-pointer transition-colors duration-150 px-[10px] py-[4px] bg-transparent text-text-secondary hover:bg-app-hover"
              style={{ fontSize: 11, border: '0.5px solid var(--color-border-hover)' }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
