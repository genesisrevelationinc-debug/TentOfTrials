import React, { Component, ReactNode } from 'react';
import { telemetry } from '../services/telemetry';

interface ErrorBoundaryProps {
  fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  fallbackError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      fallbackError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }
SRC/components/ErrorBoundary.tsx
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to telemetry service
    try {
      telemetry.logError({
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack,
      });
    } catch (telemetryError) {
      console.error('Failed to log error to telemetry:', telemetryError);
    }

    // Call onError callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('onError callback threw:', callbackError);
      }
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      fallbackError: false,
    });
  };

  handleFallbackError = (): void => {
    this.setState({ fallbackError: true });
  };

  copyErrorDetails = async (): Promise<void> => {
    const { error } = this.state;
    if (!error) return;

    const details = `Error: ${error.message}\n\nStack Trace:\n${error.stack || 'No stack trace available'}`;

    try {
      await navigator.clipboard.writeText(details);
    } catch (err) {
      console.error('Failed to copy error details to clipboard:', err);
    }
  };

  render(): ReactNode {
    const { hasError, error, fallbackError } = this.state;
    const { fallback, children } = this.props;

    if (fallbackError) {
      return <div>Something went very wrong</div>;
    }

    if (!hasError) {
      return children;
    }

    if (fallback) {
      try {
        return <>{fallback(error!, this.resetErrorBoundary)}</>;
      } catch (err) {
        console.error('Fallback UI threw an error:', err);
        this.handleFallbackError();
        return <div>Something went very wrong</div>;
      }
    }

    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>Something went wrong</h2>
        <p><strong>Error:</strong> {error?.message}</p>
        <div style={{ marginTop: '16px' }}>
          <button onClick={this.resetErrorBoundary} style={{ marginRight: '8px' }}>
            Try Again
          </button>
          <button onClick={this.copyErrorDetails}>
            Copy Error Details
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;