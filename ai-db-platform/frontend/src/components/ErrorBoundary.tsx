import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-8 text-white text-center w-full h-full min-h-[300px]">
          <div className="glass p-8 rounded-3xl max-w-md border-red-500/20 shadow-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Module Error</h2>
            <p className="text-slate-400 text-sm mb-6">
              This part of the application failed to load.
            </p>
            <div className="bg-black/20 p-3 rounded-lg mb-6 text-left border border-white/5 overflow-hidden">
              <code className="text-[10px] text-red-400 break-all">{this.state.error?.message}</code>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full bg-white/10 text-white text-sm font-medium py-3 rounded-xl flex items-center justify-center space-x-2 hover:bg-white/20 transition-all"
            >
              <RefreshCw size={16} />
              <span>Retry Component</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
