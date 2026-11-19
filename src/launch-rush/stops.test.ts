import { describe, expect, it } from 'vitest'
import { currentStop, journeyOf } from './stops'
import type { OrderView } from './state'
import type { OrderState } from './types'

const order = (state: OrderState, over: Partial<OrderView> = {}): OrderView => ({
  orderId: 'aaaaaaaa-1',
  gameId: 'g1',
  runId: null,
  state,
  invoiceNo: null,
  emailStatus: 'none',
  reservedUntil: null,
  retry: null,
  ...over,
})

const statuses = (o: OrderView | undefined) => journeyOf(o, {}).map((s) => s.status)

describe('journeyOf', () => {
  it('has five stops, all idle before a Buy', () => {
    const stops = journeyOf(undefined, {})
    expect(stops.map((s) => s.id)).toEqual(['hold', 'payment', 'queue', 'erp', 'email'])
    expect(statuses(undefined)).toEqual(['idle', 'idle', 'idle', 'idle', 'idle'])
  })

  it('holds the copy while the order waits for payment', () => {
    expect(statuses(order('reserved'))).toEqual(['active', 'idle', 'idle', 'idle', 'idle'])
  })

  it('shows the waitlist on the hold stop', () => {
    const [hold, payment] = journeyOf(order('waitlisted'), {})
    expect(hold).toMatchObject({ status: 'active', note: 'On the waitlist' })
    expect(payment.note).toBe('Waiting for a copy')
  })

  it('shows every earlier stop as reached when the stream skipped to a later state', () => {
    expect(statuses(order('completed', { emailStatus: 'simulated' }))).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(statuses(order('invoiced'))).toEqual(['done', 'done', 'done', 'active', 'idle'])
  })

  it('skips the email stop when no address was given', () => {
    expect(journeyOf(order('completed'), {})[4]).toMatchObject({ status: 'skipped', note: 'No address given' })
  })

  it('marks the hold stop when the hold expired or the copy was refunded', () => {
    expect(journeyOf(order('reservation_expired'), {})[0]).toMatchObject({ status: 'error', note: 'Hold expired' })
    expect(journeyOf(order('refunded'), {})[0].status).toBe('error')
  })

  it('shows the ERP stop in trouble while its circuit breaker is open', () => {
    expect(journeyOf(order('paid'), { 'erp-sim:shared': 'open' })[3].status).toBe('error')
  })
})

describe('currentStop', () => {
  it('is the stop in progress or in trouble', () => {
    expect(currentStop(journeyOf(order('payment_pending'), {})).id).toBe('payment')
    expect(currentStop(journeyOf(order('reservation_expired'), {})).id).toBe('hold')
  })

  it('is the last stop reached once the order is complete, and the first before a Buy', () => {
    expect(currentStop(journeyOf(order('completed', { emailStatus: 'simulated' }), {})).id).toBe('email')
    expect(currentStop(journeyOf(undefined, {})).id).toBe('hold')
  })
})
