'use client';

import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

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
    console.error('Error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={clsx(
            'p-8 flex justify-center flex-col text-center',
            this.props.className
          )}
        >
          <div>
            <AlertTriangle className='h-12 w-12 text-destructive mx-auto mb-4' />
            <h2 className='text-lg font-semibold mb-2'>Something went wrong</h2>
            <p className='text-muted-foreground mb-4'>
              An error occurred while loading this content.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className='inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
            >
              <RefreshCw className='h-4 w-4' />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
