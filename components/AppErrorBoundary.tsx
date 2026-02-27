
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children?: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * High-level error boundary to catch application-level crashes.
 * Provides a "Reboot System" UI to help users recover from fatal errors.
 */
// Renamed generic types and used Component to ensure proper inheritance
export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical System Failure:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 text-center text-white font-sans">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-[100px] animate-pulse"></div>

          <div className="max-w-md w-full glass-panel rounded-[2.5rem] p-10 border-red-500/20 bg-red-500/5 shadow-2xl backdrop-blur-3xl relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
            
            <h1 className="text-3xl font-black mb-4 tracking-tight">System Halted</h1>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
              Hardy OS has encountered a fatal exception. Session locked for safety.
            </p>
            
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
            >
              <RefreshCcw className="w-4 h-4" /> Reboot System
            </button>
            
            <div className="mt-8 opacity-20 text-[9px] font-black uppercase tracking-[0.3em]">
              Safe Mode Recovery v1.0
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
