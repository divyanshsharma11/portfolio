import { describe, expect, it } from 'vitest'
import { addReached, chaptersNow } from './rush'
import type { RunProgress } from './types'

const progress = (over: Partial<RunProgress> = {}): RunProgress => ({
  runId: 'r1',
  reserved: 0,
  waitlisted: 0,
  paid: 0,
  invoiced: 0,
  refunded: 0,
  expired: 0,
  waitlistEnded: 0,
  failed: 0,
  duplicatesBlocked: 0,
  soldOut: false,
  stockLeft: 50,
  inFlight: 0,
  ...over,
})

describe('chaptersNow', () => {
  it('has none before the first progress event', () => {
    expect(chaptersNow({ progress: null, breaker: undefined, ended: false })).toEqual([])
  })

  it('reads each chapter from its own counter', () => {
    const p = progress({ soldOut: true, duplicatesBlocked: 2, expired: 3, refunded: 1 })
    expect(chaptersNow({ progress: p, breaker: 'open', ended: false })).toEqual([
      'gate',
      'dup',
      'expiry',
      'late',
      'breaker',
    ])
  })

  it('ends with the result chapter', () => {
    expect(chaptersNow({ progress: progress(), breaker: 'closed', ended: true })).toEqual(['result'])
  })
})

describe('addReached', () => {
  it('keeps a chapter once reached, even when its counter falls back', () => {
    const seen = addReached([], chaptersNow({ progress: progress({ expired: 2 }), breaker: undefined, ended: false }))
    expect(addReached(seen, chaptersNow({ progress: progress(), breaker: undefined, ended: false }))).toEqual([
      'expiry',
    ])
  })

  it('appends new chapters in the order they were reached and returns the same array when nothing is new', () => {
    const seen = addReached(['gate'], ['gate', 'dup'])
    expect(seen).toEqual(['gate', 'dup'])
    expect(addReached(seen, ['dup'])).toBe(seen)
  })
})
