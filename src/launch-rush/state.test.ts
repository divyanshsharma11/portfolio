import { describe, expect, it } from 'vitest'
import {
  MAX_LOG_LINES,
  arrangeGames,
  initialState,
  initials,
  isPaid,
  pipelineOf,
  reduce,
  stockShare,
  tileHue,
  type DemoState,
  type OrderView,
} from './state'
import type { Game, OrderCard, StreamEvent } from './types'

const card = (over: Partial<OrderCard> = {}): OrderCard => ({
  orderId: 'aaaaaaaa-1',
  gameId: 'g1',
  runId: null,
  state: 'reserved',
  invoiceNo: null,
  emailStatus: 'none',
  reservedUntil: null,
  ...over,
})

const stream = (state: DemoState, event: StreamEvent) => reduce(state, { type: 'stream', event })
const view = (over: Partial<OrderView> = {}): OrderView => ({ ...card(), retry: null, ...over })

describe('reduce', () => {
  it('adds orders newest first and keeps retry across a card refresh', () => {
    let s = reduce(initialState, { type: 'cards', cards: [card({ orderId: 'old' }), card({ orderId: 'new' })] })
    expect(s.orderIds).toEqual(['new', 'old'])
    s = stream(s, {
      event: 'delivery.retrying',
      data: {
        orderId: 'new',
        connector: 'erp-sim',
        action: 'createSalesOrder',
        attempt: 2,
        errorClass: 'retryable',
        nextRetryAt: null,
      },
    })
    s = reduce(s, { type: 'card', card: card({ orderId: 'new', state: 'paid' }) })
    expect(s.orders.new.state).toBe('paid')
    expect(s.orderIds).toEqual(['new', 'old'])
  })

  it('moves an order on and clears its retry note on order.state', () => {
    let s = reduce(initialState, { type: 'card', card: card() })
    s = stream(s, {
      event: 'delivery.retrying',
      data: {
        orderId: 'aaaaaaaa-1',
        connector: 'erp-sim',
        action: 'createSalesOrder',
        attempt: 1,
        errorClass: 'retryable',
        nextRetryAt: null,
      },
    })
    expect(s.orders['aaaaaaaa-1'].retry?.attempt).toBe(1)
    s = stream(s, {
      event: 'order.state',
      data: { orderId: 'aaaaaaaa-1', from: 'paid', to: 'so_submitted', at: 'now' },
    })
    expect(s.orders['aaaaaaaa-1'].state).toBe('so_submitted')
    expect(s.orders['aaaaaaaa-1'].retry).toBeNull()
  })

  it('remembers where a failed order failed from, and forgets it once the order moves on', () => {
    let s = reduce(initialState, { type: 'card', card: card({ state: 'paid' }) })
    s = stream(s, { event: 'order.state', data: { orderId: 'aaaaaaaa-1', from: 'paid', to: 'failed', at: 'now' } })
    expect(s.orders['aaaaaaaa-1']).toMatchObject({ state: 'failed', failedFrom: 'paid' })
    s = stream(s, { event: 'order.state', data: { orderId: 'aaaaaaaa-1', from: 'failed', to: 'paid', at: 'later' } })
    expect(s.orders['aaaaaaaa-1'].failedFrom).toBeUndefined()
  })

  it('learns an order it has not seen from the stream and records the invoice number', () => {
    const s = stream(initialState, {
      event: 'order.state',
      data: { orderId: 'zzzzzzzz-9', from: 'invoiced', to: 'completed', at: 'now', invoiceNo: 'INV-7' },
    })
    expect(s.orderIds).toEqual(['zzzzzzzz-9'])
    expect(s.orders['zzzzzzzz-9']).toMatchObject({ state: 'completed', invoiceNo: 'INV-7' })
  })

  it('updates email status and waitlist position', () => {
    let s = reduce(initialState, { type: 'card', card: card() })
    s = stream(s, { event: 'email.status', data: { orderId: 'aaaaaaaa-1', emailStatus: 'sent_gmail' } })
    s = stream(s, { event: 'waitlist.position', data: { orderId: 'aaaaaaaa-1', waitlistPosition: 3 } })
    expect(s.orders['aaaaaaaa-1']).toMatchObject({ emailStatus: 'sent_gmail', waitlistPosition: 3 })
  })

  it('keeps breaker states per connector and run', () => {
    let s = stream(initialState, { event: 'breaker.state', data: { connector: 'erp-sim', runId: 'r1', state: 'open' } })
    s = stream(s, { event: 'breaker.state', data: { connector: 'erp-sim', runId: null, state: 'closed' } })
    expect(s.breakers).toEqual({ 'erp-sim:r1': 'open', 'erp-sim:shared': 'closed' })
  })

  it('updates stock of the listed game only', () => {
    let s = reduce(initialState, {
      type: 'games',
      games: [
        { id: 'a', title: 'A', priceMinor: 100, currency: 'INR', stockTotal: 5, stockLeft: 5 },
        { id: 'b', title: 'B', priceMinor: 100, currency: 'INR', stockTotal: 5, stockLeft: 5 },
      ],
    })
    s = stream(s, { event: 'stock', data: { gameId: 'a', stockLeft: 2 } })
    expect(s.games.map((g) => g.stockLeft)).toEqual([2, 5])
  })

  it('tracks a run from the start through progress and the end, and picks up a run after a reload', () => {
    const progress = {
      runId: 'r1',
      reserved: 1,
      waitlisted: 0,
      paid: 1,
      invoiced: 0,
      refunded: 0,
      expired: 0,
      waitlistEnded: 0,
      failed: 0,
      duplicatesBlocked: 0,
      soldOut: false,
      stockLeft: 4,
      inFlight: 1,
    }
    let s = reduce(initialState, { type: 'run-started', runId: 'r1', gameId: 'g1', endsAt: 'later' })
    s = reduce(s, { type: 'faults', faults: { latencyMs: 2000, down: false, rateLimitPerSec: 0, failureRate: 0 } })
    s = stream(s, { event: 'run.progress', data: progress })
    expect(s.run).toMatchObject({ runId: 'r1', gameId: 'g1', progress: { paid: 1 }, faults: { latencyMs: 2000 } })

    const reloaded = stream(initialState, { event: 'run.progress', data: progress })
    expect(reloaded.run).toMatchObject({ runId: 'r1', gameId: null })
  })

  it('ignores faults when there is no run', () => {
    const s = reduce(initialState, {
      type: 'faults',
      faults: { latencyMs: 1, down: false, rateLimitPerSec: 0, failureRate: 0 },
    })
    expect(s.run).toBeNull()
  })

  it('keeps only the newest log lines', () => {
    let s = initialState
    for (let i = 0; i < MAX_LOG_LINES + 10; i++) {
      s = stream(s, { event: 'email.status', data: { orderId: `order-${i}`, emailStatus: 'pending' } })
    }
    expect(s.log).toHaveLength(MAX_LOG_LINES)
    expect(s.log[0].text).toContain(`order-${MAX_LOG_LINES + 9}`.slice(0, 8))
  })
})

describe('pipelineOf', () => {
  const status = (order: OrderView | undefined, breakers = {}) => pipelineOf(order, breakers).map((n) => n.status)

  it('is idle without an order', () => {
    expect(status(undefined)).toEqual(['idle', 'idle', 'idle', 'idle'])
  })

  it('follows an order to completion', () => {
    expect(status(view({ state: 'payment_pending' }))).toEqual(['active', 'idle', 'idle', 'idle'])
    expect(status(view({ state: 'paid' }))).toEqual(['done', 'active', 'idle', 'idle'])
    expect(status(view({ state: 'so_submitted' }))).toEqual(['done', 'done', 'active', 'idle'])
    expect(status(view({ state: 'completed', emailStatus: 'pending' }))).toEqual(['done', 'done', 'done', 'active'])
    expect(status(view({ state: 'completed', emailStatus: 'sent_gmail' }))).toEqual(['done', 'done', 'done', 'done'])
    expect(status(view({ state: 'completed', emailStatus: 'none' }))).toEqual(['done', 'done', 'done', 'skipped'])
  })

  it('shows an open breaker of the order’s run on the ERP node', () => {
    const order = view({ state: 'paid', runId: 'r1' })
    expect(status(order, { 'erp-sim:r1': 'open' })[2]).toBe('error')
    expect(status(order, { 'erp-sim:r2': 'open' })[2]).toBe('idle')
  })

  it('shows a retry on the ERP node', () => {
    const retry = {
      connector: 'erp-sim',
      action: 'createSalesOrder',
      attempt: 2,
      errorClass: 'retryable' as const,
      nextRetryAt: null,
    }
    const nodes = pipelineOf(view({ state: 'paid', retry }), {})
    expect(nodes[2]).toMatchObject({ status: 'active' })
    expect(nodes[2].note).toContain('attempt 2')
  })

  it('shows refund and failure as errors', () => {
    expect(status(view({ state: 'refunded' }))[0]).toBe('error')
    expect(status(view({ state: 'failed' }))[2]).toBe('error')
  })

  it('shows a failed order as paid and picked up when it failed after paying', () => {
    for (const failedFrom of ['paid', 'so_submitted', 'invoiced'] as const) {
      const nodes = pipelineOf(view({ state: 'failed', failedFrom }), {})
      expect(nodes.map((n) => n.status)).toEqual(['done', 'done', 'error', 'idle'])
      expect(nodes[0].note).toBe('Paid')
    }
  })

  it('shows a failed refund on the Payment node and leaves the ERP node alone', () => {
    const nodes = pipelineOf(view({ state: 'failed', failedFrom: 'refund_pending' }), {})
    expect(nodes.map((n) => n.status)).toEqual(['error', 'idle', 'idle', 'idle'])
    expect(nodes[0].note).toBe('Refund failed, kept for replay')
  })

  it('claims nothing about payment for a failed order whose origin is not known yet', () => {
    const nodes = pipelineOf(view({ state: 'failed' }), {})
    expect(nodes[0]).toMatchObject({ status: 'idle', note: '' })
  })
})

describe('isPaid', () => {
  it('is true from paid to completed only', () => {
    expect(isPaid('paid')).toBe(true)
    expect(isPaid('completed')).toBe(true)
    expect(isPaid('refunded')).toBe(false)
    expect(isPaid('reserved')).toBe(false)
  })
})

describe('arrangeGames', () => {
  const game = (title: string, priceMinor: number, stockLeft: number): Game => ({
    id: title,
    title,
    priceMinor,
    currency: 'INR',
    stockTotal: 10,
    stockLeft,
  })
  const games = [game('B', 500, 5), game('A', 900, 0), game('C', 500, 9)]
  const titles = (list: Game[]) => list.map((g) => g.title)

  it('sorts by name, price (ties by name) and stock', () => {
    expect(titles(arrangeGames(games, 'name', false))).toEqual(['A', 'B', 'C'])
    expect(titles(arrangeGames(games, 'price-asc', false))).toEqual(['B', 'C', 'A'])
    expect(titles(arrangeGames(games, 'price-desc', false))).toEqual(['A', 'B', 'C'])
    expect(titles(arrangeGames(games, 'stock-desc', false))).toEqual(['C', 'B', 'A'])
  })

  it('hides sold out games on request and never changes the input list', () => {
    expect(titles(arrangeGames(games, 'name', true))).toEqual(['B', 'C'])
    expect(titles(games)).toEqual(['B', 'A', 'C'])
  })
})

describe('game tiles and stock bar', () => {
  it('takes the initials of the first two words, letters and digits only', () => {
    expect(initials('Alan Wake 2')).toBe('AW')
    expect(initials("Baldur's Gate 3")).toBe('BG')
    expect(initials('Astro Bot')).toBe('AB')
    expect(initials('Hades')).toBe('H')
    expect(initials('  ')).toBe('?')
  })

  it('gives the same hue for the same title, within 0-359', () => {
    expect(tileHue('Alan Wake 2')).toBe(tileHue('Alan Wake 2'))
    expect(tileHue('Alan Wake 2')).toBeGreaterThanOrEqual(0)
    expect(tileHue('Alan Wake 2')).toBeLessThan(360)
  })

  it('shows stock left as a share of the starting stock, never above 1 and 0 without a total', () => {
    const game = (stockTotal: number, stockLeft: number) => ({
      id: 'x',
      title: 'X',
      priceMinor: 1,
      currency: 'INR',
      stockTotal,
      stockLeft,
    })
    expect(stockShare(game(200, 50))).toBe(0.25)
    expect(stockShare(game(100, 120))).toBe(1)
    expect(stockShare(game(0, 0))).toBe(0)
  })
})
