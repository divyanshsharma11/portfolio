// The demo page's state: a pure reducer over API replies and stream events, and the views derived from it.
import type {
  BreakerState,
  EmailStatus,
  Faults,
  Game,
  OrderCard,
  OrderState,
  Retry,
  RunEnded,
  RunProgress,
  Scoreboard,
  StreamEvent,
} from './types'

// failedFrom: the last good state of a failed order (from the transition into failed), so the page knows what it had reached.
export type OrderView = OrderCard & { retry: (Retry & { orderId?: string }) | null; failedFrom?: OrderState }
export type Tone = 'info' | 'ok' | 'warn' | 'err'
export type LogLine = { id: number; text: string; tone: Tone }
export type RunView = {
  runId: string
  gameId: string | null // unknown for a run picked up from the stream after a reload
  endsAt: string | null
  progress: RunProgress | null
  ended: RunEnded | null
  faults: Faults
}

export type DemoState = {
  connection: 'connecting' | 'live' | 'reconnecting'
  games: Game[]
  orders: Record<string, OrderView>
  orderIds: string[] // newest first
  breakers: Record<string, BreakerState> // `${connector}:${runId or 'shared'}`
  run: RunView | null
  scoreboard: Scoreboard | null
  log: LogLine[]
  notice: string | null
  lines: number
}

export type Action =
  | { type: 'stream'; event: StreamEvent }
  | { type: 'games'; games: Game[] }
  | { type: 'cards'; cards: OrderCard[] }
  | { type: 'card'; card: OrderCard }
  | { type: 'run-started'; runId: string; gameId: string; endsAt: string }
  | { type: 'faults'; faults: Faults }
  | { type: 'connection'; status: DemoState['connection'] }
  | { type: 'notice'; text: string | null }

export const NO_FAULTS: Faults = { latencyMs: 0, down: false, rateLimitPerSec: 0, failureRate: 0 }
export const MAX_LOG_LINES = 60

export const initialState: DemoState = {
  connection: 'connecting',
  games: [],
  orders: {},
  orderIds: [],
  breakers: {},
  run: null,
  scoreboard: null,
  log: [],
  notice: null,
  lines: 0,
}

export const STATE_LABEL: Record<OrderState, string> = {
  reserved: 'Reserved',
  waitlisted: 'Waitlisted',
  payment_pending: 'Payment pending',
  paid: 'Paid',
  so_submitted: 'Sales Order submitted',
  invoiced: 'Invoiced',
  completed: 'Completed',
  waitlist_ended: 'Wait ended',
  reservation_expired: 'Hold expired',
  refund_pending: 'Refund pending',
  refunded: 'Refunded (sold out)',
  failed: 'Failed (kept for replay)',
}

// The honesty labels of plan §3.5.
export const EMAIL_LABEL: Record<EmailStatus, string> = {
  none: 'Email: none requested',
  pending: 'Email: pending',
  sent_gmail: 'Email: sent via Gmail ✓',
  simulated: 'Email: simulated',
  simulated_limit: 'Email: simulated (real-email limit reached)',
  failed: 'Email: failed',
}

const PAID_STATES: OrderState[] = ['paid', 'so_submitted', 'invoiced', 'completed']
export const isPaid = (state: OrderState) => PAID_STATES.includes(state)

export const shortId = (id: string) => id.slice(0, 8)
export const breakerKey = (connector: string, runId: string | null) => `${connector}:${runId ?? 'shared'}`

function log(state: DemoState, text: string, tone: Tone = 'info'): DemoState {
  const lines = state.lines + 1
  return { ...state, lines, log: [{ id: lines, text, tone }, ...state.log].slice(0, MAX_LOG_LINES) }
}

const blank = (orderId: string): OrderView => ({
  orderId,
  gameId: '',
  runId: null,
  state: 'reserved',
  invoiceNo: null,
  emailStatus: 'none',
  reservedUntil: null,
  retry: null,
})

function patchOrder(state: DemoState, orderId: string, patch: Partial<OrderView>): DemoState {
  const known = state.orders[orderId]
  const orders = { ...state.orders, [orderId]: { ...(known ?? blank(orderId)), ...patch } }
  return { ...state, orders, orderIds: known ? state.orderIds : [orderId, ...state.orderIds] }
}

function onStream(state: DemoState, { event, data }: StreamEvent): DemoState {
  switch (event) {
    case 'order.state': {
      // A step that moved the order on is no longer failing.
      const next = patchOrder(state, data.orderId, {
        state: data.to,
        retry: null,
        failedFrom: data.to === 'failed' ? (data.from ?? undefined) : undefined,
        ...(data.invoiceNo && { invoiceNo: data.invoiceNo }),
      })
      const tone: Tone =
        data.to === 'failed' ? 'err' : data.to === 'refunded' ? 'warn' : data.to === 'completed' ? 'ok' : 'info'
      return log(next, `Order ${shortId(data.orderId)}: ${STATE_LABEL[data.to]}`, tone)
    }
    case 'email.status': {
      const next = patchOrder(state, data.orderId, { emailStatus: data.emailStatus })
      return log(
        next,
        `Order ${shortId(data.orderId)}: ${EMAIL_LABEL[data.emailStatus]}`,
        data.emailStatus === 'failed' ? 'err' : 'info',
      )
    }
    case 'waitlist.position': {
      const next = patchOrder(state, data.orderId, { waitlistPosition: data.waitlistPosition })
      return log(next, `Order ${shortId(data.orderId)}: waiting, place ${data.waitlistPosition}`)
    }
    case 'delivery.retrying': {
      const { orderId, ...retry } = data
      const text = `Order ${shortId(orderId)}: ${retry.connector} ${retry.action} failed (${retry.errorClass}), attempt ${retry.attempt}, will retry`
      return log(patchOrder(state, orderId, { retry }), text, 'warn')
    }
    case 'breaker.state': {
      const breakers = { ...state.breakers, [breakerKey(data.connector, data.runId)]: data.state }
      const tone: Tone = data.state === 'open' ? 'err' : data.state === 'halfOpen' ? 'warn' : 'ok'
      return log(
        { ...state, breakers },
        `Circuit breaker ${data.connector} (${data.runId ? 'your run' : 'shared'}): ${data.state}`,
        tone,
      )
    }
    case 'run.progress':
      return { ...state, run: runOf(state, data.runId, { progress: data }) }
    case 'run.ended': {
      const text = `Run ${data.status}: sold ${data.sold}, refunded ${data.refunded}, oversold ${data.oversold}, lost ${data.lost}`
      const next = { ...state, run: runOf(state, data.runId, { progress: data, ended: data }) }
      return log(next, text, data.oversold === 0 && data.lost === 0 ? 'ok' : 'err')
    }
    case 'stock':
      return {
        ...state,
        games: state.games.map((g) => (g.id === data.gameId ? { ...g, stockLeft: data.stockLeft } : g)),
      }
    case 'scoreboard':
      return { ...state, scoreboard: data }
  }
}

// The run the stream talks about; a run the page did not start itself (after a reload) is picked up from its events.
function runOf(state: DemoState, runId: string, patch: Partial<RunView>): RunView {
  const current: RunView =
    state.run?.runId === runId
      ? state.run
      : { runId, gameId: null, endsAt: null, progress: null, ended: null, faults: NO_FAULTS }
  return { ...current, ...patch }
}

export function reduce(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'stream':
      return onStream(state, action.event)
    case 'games':
      return { ...state, games: action.games }
    case 'cards': {
      // Oldest first from the API, so the newest ends up first in orderIds.
      let next = state
      for (const card of action.cards) {
        next = patchOrder(next, card.orderId, { ...card, retry: next.orders[card.orderId]?.retry ?? null })
      }
      return next
    }
    case 'card':
      return patchOrder(state, action.card.orderId, action.card)
    case 'run-started': {
      const { runId, gameId, endsAt } = action
      const run: RunView = { runId, gameId, endsAt, progress: null, ended: null, faults: NO_FAULTS }
      return log({ ...state, run }, 'Rush started: simulated buyers are arriving')
    }
    case 'faults':
      return state.run ? { ...state, run: { ...state.run, faults: action.faults } } : state
    case 'connection':
      return { ...state, connection: action.status }
    case 'notice':
      return { ...state, notice: action.text }
  }
}

export type NodeStatus = 'idle' | 'active' | 'done' | 'error' | 'skipped'
export type PipelineNode = {
  id: 'payment' | 'queue' | 'erp' | 'email'
  label: string
  status: NodeStatus
  note: string
}

const node = (id: PipelineNode['id'], label: string, status: NodeStatus = 'idle', note = ''): PipelineNode => ({
  id,
  label,
  status,
  note,
})

// The four stops of plan §3.1 (Payment, Queue, ERP, Email) for one order.
export function pipelineOf(order: OrderView | undefined, breakers: Record<string, BreakerState>): PipelineNode[] {
  if (!order) return [node('payment', 'Payment'), node('queue', 'Queue'), node('erp', 'ERP'), node('email', 'Email')]
  const { state } = order
  const failedAfterRefund = state === 'failed' && order.failedFrom === 'refund_pending'
  const failedAfterPaying = state === 'failed' && !!order.failedFrom && !failedAfterRefund

  let payment = node(
    'payment',
    'Payment',
    'idle',
    state === 'waitlisted' ? 'Waiting for a copy' : state === 'failed' ? '' : 'Waiting for payment',
  )
  if (state === 'payment_pending') payment = node('payment', 'Payment', 'active', 'Charging (simulated)')
  else if (state === 'refund_pending') payment = node('payment', 'Payment', 'active', 'Refunding')
  else if (state === 'refunded') payment = node('payment', 'Payment', 'error', 'Refunded (sold out)')
  else if (state === 'reservation_expired') payment = node('payment', 'Payment', 'error', 'Hold expired')
  else if (failedAfterRefund) payment = node('payment', 'Payment', 'error', 'Refund failed, kept for replay')
  else if (isPaid(state) || failedAfterPaying) payment = node('payment', 'Payment', 'done', 'Paid')

  const queue =
    state === 'paid'
      ? node('queue', 'Queue', 'active', 'Waiting for a worker')
      : state === 'so_submitted' || state === 'invoiced' || state === 'completed' || failedAfterPaying
        ? node('queue', 'Queue', 'done', 'Picked up')
        : node('queue', 'Queue')

  const breaker = breakers[breakerKey('erp-sim', order.runId)]
  const retrying =
    order.retry?.connector === 'erp-sim' ? `Retry after attempt ${order.retry.attempt} (${order.retry.errorClass})` : ''
  let erp = node('erp', 'ERP')
  if (state === 'failed' && !failedAfterRefund) erp = node('erp', 'ERP', 'error', 'Failed, kept for replay')
  else if (state === 'completed') erp = node('erp', 'ERP', 'done', 'Invoice submitted')
  else if (breaker === 'open' && (state === 'paid' || state === 'so_submitted' || state === 'invoiced')) {
    erp = node('erp', 'ERP', 'error', 'Circuit breaker open')
  } else if (state === 'so_submitted' || state === 'invoiced')
    erp = node('erp', 'ERP', 'active', retrying || STATE_LABEL[state])
  else if (state === 'paid' && retrying) erp = node('erp', 'ERP', 'active', retrying)

  let email = node('email', 'Email')
  if (state === 'completed') {
    const { emailStatus } = order
    if (emailStatus === 'pending') email = node('email', 'Email', 'active', 'Sending')
    else if (emailStatus === 'failed') email = node('email', 'Email', 'error', 'Failed')
    else if (emailStatus === 'none') email = node('email', 'Email', 'skipped', 'No address given')
    else email = node('email', 'Email', 'done', EMAIL_LABEL[emailStatus].replace('Email: ', ''))
  }
  return [payment, queue, erp, email]
}

export const money = (priceMinor: number, currency: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(priceMinor / 100)

export type GameSort = 'name' | 'price-asc' | 'price-desc' | 'stock-desc'

const COMPARE: Record<GameSort, (a: Game, b: Game) => number> = {
  name: (a, b) => a.title.localeCompare(b.title),
  'price-asc': (a, b) => a.priceMinor - b.priceMinor || a.title.localeCompare(b.title),
  'price-desc': (a, b) => b.priceMinor - a.priceMinor || a.title.localeCompare(b.title),
  'stock-desc': (a, b) => b.stockLeft - a.stockLeft || a.title.localeCompare(b.title),
}

export function arrangeGames(games: Game[], sort: GameSort, hideSoldOut: boolean): Game[] {
  return games.filter((game) => !hideSoldOut || game.stockLeft > 0).sort(COMPARE[sort])
}

export function initials(title: string): string {
  const words = title.replace(/['’]/g, '').match(/[\p{L}\p{N}]+/gu) ?? []
  return (
    words
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '?'
  )
}

export function tileHue(title: string): number {
  return [...title].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 7)
}

export function stockShare(game: Game): number {
  return game.stockTotal > 0 ? Math.min(1, game.stockLeft / game.stockTotal) : 0
}
