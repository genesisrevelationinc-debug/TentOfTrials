import React, { Component, ReactNode } from 'react';
import { telemetry } from '../services/telemetry';

interface Props {
  fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  fallbackError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      fallbackError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console.error
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to telemetry service
    try {
      telemetry.trackError({
        message: error.message,
        stack: error.stack,
        component: 'ErrorBoundary',
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

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, fallbackError: false });
  };

  handleFallbackError = () => {
    this.setState({ fallbackError: true });
  };

  render() {
    const { hasError, error, fallbackError } = this.state;
    const { fallback, children } = this.props;

    // If the fallback UI itself fails, show minimal error message
    if (fallbackError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h2>Something went very wrong</h2>
        </div>
      );
    }

    if (hasError && error) {
      try {
        if (fallback) {
          return (
            <FallbackWrapper
              fallback={fallback}
              error={error}
              resetErrorBoundary={this.resetErrorBoundary}
              onError={this.handleFallbackError}
            />
          );
        }

        // Default fallback UI
        return (
          <DefaultFallback
            error={error}
            resetErrorBoundary={this.resetErrorBoundary}
          />
        );
      } catch (renderError) {
        this.handleFallbackError();
        return null;
      }
    }

    return children;
  }
}

// Wrapper to catch errors in the fallback UI itself
function FallbackWrapper({
  fallback,
  error,
  resetErrorBoundary,
  onError,
}: {
  fallback: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  error: Error;
  resetErrorBoundary: () => void;
  onError: () => void;
}) {
  try {
    return <>{fallback(error, resetErrorBoundary)}</>;
  } catch (e) {
    onError();
    return null;
  }
}

// Default fallback UI component
function DefaultFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const handleCopyError = async () => {
    const errorDetails = `Error: ${error.message}\n\nStack Trace:\n${error.stack || 'No stack trace available'}`;
    try {
      await navigator.clipboard.writeText(errorDetails);
      alert('Error details copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy error details:', err);
      alert('Failed to copy error details. See console for details.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Something went wrong</h2>
      <p style={{ color: '#d32f2f', marginBottom: '16px' }}>{error.message}</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={resetErrorBoundary}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Try Again
        </button>
        <button
          onClick={handleCopyError}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#388e3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Copy Error Details
        </button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
export { ErrorBoundary };