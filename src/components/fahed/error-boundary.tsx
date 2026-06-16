'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Force a full reload to clear any bad state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0F0F0F' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(92,26,27,0.1)' }}
            >
              <AlertTriangle size={40} strokeWidth={1.5} color="#5C1A1B" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              نعتذر عن هذا الخطأ. يرجى إعادة تشغيل التطبيق والمحاولة مرة أخرى.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-600 mb-4 font-mono break-all max-h-20 overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)', boxShadow: '0 4px 16px rgba(92,26,27,0.3)' }}
            >
              <RefreshCw size={18} strokeWidth={1.5} />
              إعادة تشغيل التطبيق
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
