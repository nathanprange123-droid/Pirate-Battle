import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  fallback: () => ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/** Shows a fallback instead of a blank page when a screen fails to load or render. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('A screen failed to load:', error, info.componentStack)
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback() : this.props.children
  }
}
