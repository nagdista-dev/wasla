import { Component, type ReactNode, type ErrorInfo } from 'react';
import ErrorPage from './ErrorPage';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.MODE === 'development') {
      console.group('ErrorBoundary caught an error');
      console.error('Error:', error);
      console.error('Component stack:', errorInfo.componentStack);
      console.groupEnd();
    }
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorPage
          type="APPLICATION"
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
