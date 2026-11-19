// The launch-rush backend's HTTP API (launch-rush/docs/design-v1.md §5). The session id is kept in localStorage and
// sent as X-Session-Id: the backend is another site, so a cookie would be a third-party cookie (plan §3.4).
import type { Faults, Game, OrderCard } from './types'

const SESSION_KEY = 'launch-rush-session'

export class ApiError extends Error {
  status: number
  code: string
  retryAfter: number | null
  fields: Record<string, unknown>
  constructor(
    status: number,
    code: string,
    message: string,
    retryAfter: number | null,
    fields: Record<string, unknown>,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    this.fields = fields
  }
}

// What the visitor reads for each error code of design §5.
const MESSAGES: Record<string, string> = {
  already_reserved: 'You already have an active order for this game.',
  unknown_game: 'That game is not in the demo store.',
  run_ended: 'This run has ended.',
  run_active: 'You already have a rush in progress.',
  runs_busy: 'Too many rushes are running right now. Try again in a moment.',
  rush_disabled: 'Rush runs are switched off at the moment.',
  rate_limited: 'Too many requests. Wait a moment and try again.',
  invalid_state: 'That is not possible in the order’s current state.',
  invalid_email: 'That email address does not look valid.',
  payment_unavailable: 'The simulated payment provider did not answer. Press Pay again.',
  unavailable: 'The demo backend is not available right now.',
  invalid_input: 'That input was not accepted.',
}

export const messageOf = (err: unknown) =>
  err instanceof ApiError ? (MESSAGES[err.code] ?? err.message) : 'Could not reach the demo backend.'

const store = {
  get: () => {
    try {
      return localStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  },
  set: (id: string | null) => {
    try {
      if (id) localStorage.setItem(SESSION_KEY, id)
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      // Private mode: the session then lasts until the page is closed.
    }
  },
}

export function createApi(base: string) {
  let sessionId = store.get()

  async function request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
    withSession = true,
  ): Promise<T> {
    const res = await fetch(`${base}/api${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(withSession && sessionId && { 'X-Session-Id': sessionId }),
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const body = await res.json().catch(() => null) // 202 and 204 replies have no body
    if (!res.ok) {
      const { code = 'unavailable', message = res.statusText, ...fields } = body?.error ?? {}
      if (res.status === 401 && code === 'session_required') {
        sessionId = null
        store.set(null)
      }
      throw new ApiError(res.status, code, message, Number(res.headers.get('retry-after')) || null, fields)
    }
    return body as T
  }

  return {
    // The stored session if the backend still knows it, else a new one.
    async ensureSession(): Promise<string> {
      if (sessionId) {
        try {
          await request('/orders')
          return sessionId
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 401)) throw err
        }
      }
      const created = await request<{ sessionId: string }>('/session', { method: 'POST' }, false)
      sessionId = created.sessionId
      store.set(sessionId)
      return sessionId
    },
    streamUrl: (id: string) => `${base}/api/stream?session=${encodeURIComponent(id)}`,

    games: async () => (await request<{ games: Game[] }>('/games')).games,
    orders: async () => (await request<{ orders: OrderCard[] }>('/orders')).orders,
    buy: (gameId: string, runId?: string) =>
      request<{
        orderId: string
        state: 'reserved' | 'waitlisted'
        reservedUntil?: string
        waitlistPosition?: number
        waitlistUntil?: string
      }>('/orders', { method: 'POST', body: { gameId, ...(runId && { runId }) } }),
    pay: (orderId: string, email: string) =>
      request(`/orders/${orderId}/pay`, { method: 'POST', body: email ? { email } : {} }),
    resendWebhook: (orderId: string) => request(`/orders/${orderId}/resend-webhook`, { method: 'POST' }),

    startRun: (body: { gameId: string; buyers: number; stock: number; faults?: Partial<Faults> }) =>
      request<{ runId: string; endsAt: string }>('/runs', { method: 'POST', body }),
    setFaults: (runId: string, faults: Partial<Faults>) =>
      request(`/runs/${runId}/faults`, { method: 'PUT', body: faults }),
    stopRun: (runId: string) => request(`/runs/${runId}/stop`, { method: 'POST' }),
  }
}

export type Api = ReturnType<typeof createApi>
