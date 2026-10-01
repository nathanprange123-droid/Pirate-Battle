import axios from 'axios'
import { testApiTimeout } from '../testing/testMode'

/** Requests that take longer than this are treated as a timeout. Tests may shorten it. */
export const API_TIMEOUT_MS =
  testApiTimeout() ?? Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 8000)

/** The single Axios instance used for ranking and history. */
export const apiClient = axios.create({
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})
