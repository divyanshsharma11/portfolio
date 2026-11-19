import { pipelineOf, type NodeStatus, type OrderView, type PipelineNode } from './state'
import type { BreakerState } from './types'

export type JourneyStop = {
  id: 'hold' | PipelineNode['id']
  label: string
  status: NodeStatus
  note: string
  why: string
}

const WHY: Record<JourneyStop['id'], string> = {
  hold: 'Two buyers can never get the last copy: the stock check and the decrement happen inside one atomic Redis script.',
  payment:
    'Webhooks can arrive twice. The signature is checked on the raw body and the event id is de-duplicated before anything is saved.',
  queue: 'The answer goes back fast and the slow work moves to a worker, so a slow ERP never blocks payments.',
  erp: 'The worker creates the Sales Order, Invoice and Payment Entry in the simulated ERP, with retries and a circuit breaker if it struggles.',
  email:
    'A separate job sends the confirmation. A failed email never fails a paid, invoiced order. For your own order it is real only if you gave an address.',
}

const stop = (id: JourneyStop['id'], label: string, status: NodeStatus = 'idle', note = ''): JourneyStop => ({
  id,
  label,
  status,
  note,
  why: WHY[id],
})

// Where the order stands on the copy it holds; the four stops after it come from pipelineOf.
function holdOf(order: OrderView | undefined): JourneyStop {
  if (!order) return stop('hold', 'Hold', 'idle', 'Press Buy')
  switch (order.state) {
    case 'reserved':
      return stop('hold', 'Hold', 'active', 'Copy held for you')
    case 'waitlisted':
      return stop('hold', 'Hold', 'active', 'On the waitlist')
    case 'reservation_expired':
      return stop('hold', 'Hold', 'error', 'Hold expired')
    case 'waitlist_ended':
      return stop('hold', 'Hold', 'error', 'Wait ended, no copy')
    case 'refund_pending':
    case 'refunded':
      return stop('hold', 'Hold', 'error', 'Copy was no longer held')
    default:
      return stop('hold', 'Hold', 'done', 'Copy reserved')
  }
}

// Every stop is derived from the order's current state, never from a history of events, so a stream that skipped steps
// (design §8.5) still shows the right stops.
export function journeyOf(order: OrderView | undefined, breakers: Record<string, BreakerState>): JourneyStop[] {
  const rest = pipelineOf(order, breakers).map((node): JourneyStop => ({ ...node, why: WHY[node.id] }))
  return [holdOf(order), ...rest]
}

// The stop to explain: the one in trouble or in progress, else the last one reached, else the first.
export function currentStop(stops: JourneyStop[]): JourneyStop {
  const busy = stops.find((s) => s.status === 'active' || s.status === 'error')
  if (busy) return busy
  const reached = stops.filter((s) => s.status === 'done' || s.status === 'skipped')
  return reached[reached.length - 1] ?? stops[0]
}
