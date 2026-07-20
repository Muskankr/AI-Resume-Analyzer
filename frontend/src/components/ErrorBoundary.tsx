import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light text-dark">
          <div className="text-center p-5 bg-white rounded shadow border" style={{ maxWidth: '600px', width: '90%' }}>
            <h1 className="text-danger mb-4 fs-2 fw-bold">Oops! Something went wrong.</h1>
            <p className="text-muted mb-4 fs-5">
              The application encountered an unexpected error. Please refresh the page to try again.
            </p>
            <button className="btn btn-primary px-4 py-2 fw-medium" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 text-start bg-light p-3 rounded overflow-auto border" style={{ maxHeight: '200px' }}>
                <small className="text-danger font-monospace">
                  <strong>{this.state.error.name}:</strong> {this.state.error.message}
                </small>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
