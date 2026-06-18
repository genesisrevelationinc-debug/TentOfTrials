import React, { Component, ReactNode } from 'react';
import { telemetry } from '../services/telemetry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  fallbackHasError: boolean;
}

/**
 * A reusable error boundary component that catches React render errors
 * and displays a fallback UI with error details and recovery options.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      fallbackHasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console.error
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to telemetry service
    try {
      telemetry.logError({
        message: error.message,
        stack: error.stack || undefined,
        component: errorInfo.componentStack,
      });
    } catch (telemetryError) {
      console.error('Failed to log error to telemetry:', telemetryError);
    }

    // Call the onError callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('ErrorBoundary onError callback failed:', callbackError);
      }
    }

    // Update state with error info
    this.setState({ errorInfo });
  }

  handleTryAgain = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      fallbackHasError: false,
    });
  };

  handleCopyErrorDetails = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorDetails = `Error: ${error.message}\n\nStack Trace:\n${error.stack || 'No stack trace available'}\n\nComponent Stack:\n${errorInfo?.componentStack || 'No component stack available'}`;

    try {
      await navigator.clipboard.writeText(errorDetails);
    } catch (err) {
      console.error('Failed to copy error details to clipboard:', err);
    }
  };

  render(): ReactNode {
    if (this.state.fallbackHasError) {
      return <div>Something went very wrong</div>;
    }

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default fallback UI
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <p><strong>Error:</strong> {this.state.error?.message || 'Unknown error'}</p>
          <div style={{ marginTop: '20px' }}>
            <button onClick={this.handleTryAgain} style={{ marginRight: '10px' }}>
              Try Again
            </button>
            <button onClick={this.handleCopyErrorDetails}>
              Copy Error Details
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;