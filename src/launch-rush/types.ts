// Shapes of the launch-rush backend's replies and live events (launch-rush/docs/design-v1.md §5, §8).

export type OrderState =
  | 'reserved'
  | 'waitlisted'
  | 'payment_pending'
  | 'paid'
  | 'so_submitted'
  | 'invoiced'
  | 'completed'
  | 'waitlist_ended'
  | 'reservation_expired'
  | 'refund_pending'
  | 'refunded'
  | 'failed'

export type EmailStatus = 'none' | 'pending' | 'sent_gmail' | 'simulated' | 'simulated_limit' | 'failed'

export type Game = {
  id: string
  title: string
  priceMinor: number
  currency: string
  stockTotal: number
  stockLeft: number
}

export type Faults = { latencyMs: number; down: boolean; rateLimitPerSec: number; failureRate: number }

export type OrderCard = {
  orderId: string
  gameId: string
  runId: string | null
  state: OrderState
  invoiceNo: string | null
  emailStatus: EmailStatus
  reservedUntil: string | null
  waitlistPosition?: number | null
  waitlistUntil?: string | null
}

export type Retry = {
  connector: string
  action: string
  attempt: number
  errorClass: 'retryable' | 'rateLimited'
  nextRetryAt: string | null
}

export type RunProgress = {
  runId: string
  reserved: number
  waitlisted: number
  paid: number
  invoiced: number
  refunded: number
  expired: number
  waitlistEnded: number
  failed: number
  duplicatesBlocked: number
  soldOut: boolean
  stockLeft: number
  inFlight: number
}

export type RunEnded = RunProgress & {
  status: 'finished' | 'stopped'
  sold: number
  stockTotal: number
  buyersRequested: number
  oversold: number
  lost: number
  paidNotInvoicedOrRefunded: number
  completedWithoutInvoice: number
  stockMismatch: boolean
}

export type Scoreboard = {
  sold: number
  stock: number
  oversold: number
  lost: number
  paidNotInvoicedOrRefunded: number
  completedWithoutInvoice: number
  duplicatesBlocked: number
  stockMismatches: string[]
  checkedAt: string
}

export type BreakerState = 'open' | 'halfOpen' | 'closed'

// The events of GET /api/stream, by event name.
export type StreamEvent =
  | {
      event: 'order.state'
      data: { orderId: string; from: OrderState | null; to: OrderState; at: string; invoiceNo?: string }
    }
  | { event: 'email.status'; data: { orderId: string; emailStatus: EmailStatus } }
  | { event: 'waitlist.position'; data: { orderId: string; waitlistPosition: number } }
  | { event: 'delivery.retrying'; data: Retry & { orderId: string } }
  | { event: 'breaker.state'; data: { connector: string; runId: string | null; state: BreakerState } }
  | { event: 'run.progress'; data: RunProgress }
  | { event: 'run.ended'; data: RunEnded }
  | { event: 'stock'; data: { gameId: string; stockLeft: number } }
  | { event: 'scoreboard'; data: Scoreboard }

export const STREAM_EVENTS: StreamEvent['event'][] = [
  'order.state',
  'email.status',
  'waitlist.position',
  'delivery.retrying',
  'breaker.state',
  'run.progress',
  'run.ended',
  'stock',
  'scoreboard',
]
