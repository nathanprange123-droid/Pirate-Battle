import { QueryClient } from '@tanstack/react-query'
import { isRetryable } from './errors'

const MAX_RETRIES = 2

export function retryDelay(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4000)
}

export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryable(error)
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: shouldRetry,
        retryDelay,
      },
    },
  })
}
