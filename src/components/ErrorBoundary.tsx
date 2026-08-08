"use client";

import clsx from "clsx";
import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  className?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={clsx(
            "flex flex-col justify-center p-8 text-center",
            this.props.className,
          )}
        >
          <div>
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-lg">Something went wrong</h2>
            <p className="mb-4 text-muted-foreground">
              An error occurred while loading this content.
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              onClick={() => this.setState({ hasError: false })}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
