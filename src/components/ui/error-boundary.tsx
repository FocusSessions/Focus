"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="card flex flex-col items-center justify-center p-6 text-center border-dashed border-terracotta/30 bg-terracotta/5">
          <AlertCircle className="h-8 w-8 text-terracotta/70 mb-3" />
          <h3 className="font-semibold text-brown text-sm">
            {this.props.title || "Widget failed to load"}
          </h3>
          <p className="mt-1 text-xs text-brown-muted max-w-[200px]">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-4 px-3 py-1.5 text-xs font-medium bg-surface hover:bg-surface-dark border border-border rounded-cozy transition-colors text-brown-muted"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
