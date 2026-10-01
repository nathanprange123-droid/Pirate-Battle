import { isAxiosError } from 'axios'

export type ApiErrorKind = 'timeout' | 'network' | 'client' | 'server' | 'unknown'

export function classifyError(error: unknown): ApiErrorKind {
  if (!isAxiosError(error)) return 'unknown'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout'
  if (!error.response) return 'network'
  return error.response.status >= 500 ? 'server' : 'client'
}

/** Short, user-facing explanation of what went wrong. */
export function describeError(error: unknown): string {
  switch (classifyError(error)) {
    case 'timeout':
      return 'The server took too long to answer.'
    case 'network':
      return 'Could not reach the server.'
    case 'server':
      return 'The server had a problem.'
    case 'client':
      return 'The server rejected the request.'
    default:
      return 'Something went wrong.'
  }
}

/** Timeouts, connection failures and 5xx may work on a second try; 4xx will not. */
export function isRetryable(error: unknown): boolean {
  const kind = classifyError(error)
  return kind === 'timeout' || kind === 'network' || kind === 'server'
}
