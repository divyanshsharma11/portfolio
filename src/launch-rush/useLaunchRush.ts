// Connects the page to the backend: a session, the live stream, and the visitor's actions.
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { createApi, messageOf } from './api'
import { initialState, reduce } from './state'
import { STREAM_EVENTS, type Faults, type StreamEvent } from './types'

const RECONNECT_MS = [1000, 2000, 5000, 10_000]

export function useLaunchRush(apiBase: string) {
  const api = useMemo(() => createApi(apiBase), [apiBase])
  const [state, dispatch] = useReducer(reduce, initialState)
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    let stopped = false
    let source: EventSource | null = null
    let timer: number | undefined
    let failures = 0

    const retry = () => {
      if (stopped) return
      dispatch({ type: 'connection', status: 'reconnecting' })
      timer = window.setTimeout(connect, RECONNECT_MS[Math.min(failures++, RECONNECT_MS.length - 1)])
    }

    // A refused stream (401 unknown session, 429 too many streams) does not reconnect by itself: EventSource gives up
    // on any status other than 200 (design §8.1), so the page asks again after a pause.
    function open(sessionId: string) {
      source = new EventSource(api.streamUrl(sessionId))
      source.onopen = () => {
        failures = 0
        dispatch({ type: 'connection', status: 'live' })
        dispatch({ type: 'notice', text: null })
      }
      for (const name of STREAM_EVENTS) {
        source.addEventListener(name, (e) => {
          const data = JSON.parse((e as MessageEvent<string>).data)
          dispatch({ type: 'stream', event: { event: name, data } as StreamEvent })
        })
      }
      source.onerror = () => {
        if (source?.readyState === EventSource.CONNECTING)
          return dispatch({ type: 'connection', status: 'reconnecting' })
        source?.close()
        retry()
      }
    }

    async function connect() {
      try {
        const sessionId = await api.ensureSession()
        if (stopped) return
        const [games, cards] = await Promise.all([api.games(), api.orders()])
        if (stopped) return
        dispatch({ type: 'games', games })
        dispatch({ type: 'cards', cards })
        open(sessionId)
      } catch (err) {
        dispatch({ type: 'notice', text: messageOf(err) })
        retry()
      }
    }

    void connect()
    return () => {
      stopped = true
      source?.close()
      window.clearTimeout(timer)
    }
  }, [api])

  // Runs one visitor action; a refused one is shown as a notice instead of thrown.
  const attempt = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    dispatch({ type: 'notice', text: null })
    try {
      return await action()
    } catch (err) {
      dispatch({ type: 'notice', text: messageOf(err) })
      return undefined
    }
  }, [])

  return {
    state,

    async buy(gameId: string, runId?: string) {
      const bought = await attempt(() => api.buy(gameId, runId))
      if (!bought) return false
      dispatch({
        type: 'card',
        card: {
          orderId: bought.orderId,
          gameId,
          runId: runId ?? null,
          state: bought.state,
          invoiceNo: null,
          emailStatus: 'none',
          reservedUntil: bought.reservedUntil ?? null,
          waitlistPosition: bought.waitlistPosition ?? null,
          waitlistUntil: bought.waitlistUntil ?? null,
        },
      })
      return true
    },

    pay: (orderId: string, email: string) => attempt(() => api.pay(orderId, email.trim())),
    resend: (orderId: string) => attempt(() => api.resendWebhook(orderId)),

    async startRun(gameId: string, buyers: number, stock: number) {
      const started = await attempt(() => api.startRun({ gameId, buyers, stock }))
      if (started) dispatch({ type: 'run-started', runId: started.runId, gameId, endsAt: started.endsAt })
    },

    async setFaults(change: Partial<Faults>) {
      const run = latest.current.run
      if (!run) return
      const faults = { ...run.faults, ...change }
      if (await attempt(async () => (await api.setFaults(run.runId, faults), true)))
        dispatch({ type: 'faults', faults })
    },

    stopRun: () => {
      const run = latest.current.run
      return run && attempt(() => api.stopRun(run.runId))
    },
  }
}
