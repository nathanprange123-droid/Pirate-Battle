import type { ReactNode } from 'react'
import { describeError } from '../api/errors'

interface QueryStateProps {
  isPending: boolean
  error: unknown
  isEmpty: boolean
  isFetching: boolean
  loadingText: string
  emptyText: string
  errorTitle: string
  onRetry: () => void
  children: ReactNode
}

/** Shared loading, empty, error and background-refresh handling for the log tabs. */
export function QueryState({
  isPending,
  error,
  isEmpty,
  isFetching,
  loadingText,
  emptyText,
  errorTitle,
  onRetry,
  children,
}: QueryStateProps) {
  if (isPending) {
    return (
      <p className="log-message" role="status">
        {loadingText}
      </p>
    )
  }

  if (error) {
    return (
      <div className="log-message" role="alert">
        <p>
          <strong>{errorTitle}</strong> {describeError(error)}
        </p>
        <button type="button" className="text-button" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }

  if (isEmpty) {
    return <p className="log-message">{emptyText}</p>
  }

  return (
    <>
      <p className="log-refresh" role="status">
        {isFetching ? 'Updating…' : ''}
      </p>
      {children}
    </>
  )
}
