
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Power } from 'lucide-react';
import { addLog } from '../services/logService';

// Renamed Props to ErrorBoundaryProps to avoid name collisions and added optional key
interface ErrorBoundaryProps {
  children?: ReactNode;
  componentName: string;
  onReset?: () => void;
  key?: React.Key;
}

// Renamed State to ErrorBoundaryState for clarity
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch errors in child components.
 * This prevents a single faulty widget or admin tab from crashing the entire signage display.
 */
// Use Component<ErrorBoundaryProps, ErrorBoundaryState> for proper TypeScript inheritance
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.componentName}:`, error, errorInfo);
    
    addLog({
      level: 'error',
      source: this.props.componentName,
      message: error.message,
      stack: error.stack
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] glass-panel rounded-[2rem] flex flex-col items-center justify-center p-10 text-center border-red-500/30 bg-red-500/5 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500 opacity-60" />
          </div>
          
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-400 mb-2">Section Halted</h3>
          <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mb-8">
            The <span className="text-white/80">{this.props.componentName}</span> component encountered a runtime error and was isolated for safety.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all border border-white/5 shadow-xl shadow-black/20"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Recover Section
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600/20 hover:bg-red-600/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 transition-all border border-red-500/20 shadow-xl shadow-red-900/10"
            >
              <Power className="w-3.5 h-3.5" /> Full Reboot
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 w-full max-w-xs">
            <div className="text-[9px] font-mono text-white/20 uppercase overflow-hidden text-ellipsis whitespace-nowrap">
              {this.state.error?.message || "Unknown Exception"}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
