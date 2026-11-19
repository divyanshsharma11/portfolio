import type { BreakerState, RunProgress } from './types'

export type ChapterId = 'gate' | 'dup' | 'expiry' | 'late' | 'breaker' | 'result'
export type Chapter = { id: ChapterId; chip: string; text: string; why: string }

export const CHAPTERS: Chapter[] = [
  {
    id: 'gate',
    chip: 'Atomic gate + waitlist',
    text: 'The copies are gone. Buyers who arrive now join a numbered waitlist, in arrival order, and wait for a copy to free up or for the run to end.',
    why: 'One Redis script checks the stock, takes a copy and records it in a single step, so two buyers can never get the last copy. Anyone arriving when stock is 0, or when people are already waiting, gets a waitlist place.',
  },
  {
    id: 'dup',
    chip: 'Duplicate blocked',
    text: 'The payment provider sent the same "paid" message twice. The repeat was blocked: still one invoice.',
    why: 'Every payment event has an id. A repeat is rejected at the database (primary key) and the queue ignores the repeated job id, so a retry cannot invoice twice.',
  },
  {
    id: 'expiry',
    chip: 'Hold expiry',
    text: 'Some buyers never paid. Their hold ran out and the copy went to the next person in line.',
    why: 'A sweeper job finds holds past their time, marks them expired and runs a release script: the copy goes to the earliest waiter, otherwise back to stock.',
  },
  {
    id: 'late',
    chip: 'Paid after sold out',
    text: 'A buyer paid after their hold ended and no copy was free, so they were refunded automatically. Nothing was dropped.',
    why: 'A late payment first tries to take a free copy, but only if nobody is waiting. If none is free, the order is refunded.',
  },
  {
    id: 'breaker',
    chip: 'ERP breaker',
    text: 'The ERP is failing. Calls retry with growing waits, then the circuit breaker opens to stop hammering it. Paid orders wait in the queue; none are lost.',
    why: 'Retries back off 1–2 s, 2–4 s, 4–8 s, 8–16 s (5 attempts). The breaker opens after repeated failures, and jobs wait for it instead of using up attempts. When the ERP is back, queued orders finish.',
  },
  {
    id: 'result',
    chip: 'Result checked',
    text: 'Done. The reconciler recomputes the counts from the database, not from what you watched.',
    why: 'The proof counts come from SQL over the orders table, independent of the live events.',
  },
]

type Signals = { progress: RunProgress | null; breaker: BreakerState | undefined; ended: boolean }

// The chapters the run's own counters say have happened. The counters are the stream's run.progress fields, so a
// reconnect that skipped events still lands on the right chapters.
export function chaptersNow({ progress, breaker, ended }: Signals): ChapterId[] {
  const now: [ChapterId, boolean][] = [
    ['gate', !!progress?.soldOut],
    ['dup', (progress?.duplicatesBlocked ?? 0) > 0],
    ['expiry', (progress?.expired ?? 0) > 0],
    ['late', (progress?.refunded ?? 0) > 0],
    ['breaker', breaker === 'open'],
    ['result', ended],
  ]
  return now.filter(([, reached]) => reached).map(([id]) => id)
}

// A chapter stays reached once seen: some counters (expired, the breaker) can fall back later. Returns the same array
// when nothing is new.
export function addReached(seen: ChapterId[], now: ChapterId[]): ChapterId[] {
  const fresh = now.filter((id) => !seen.includes(id))
  return fresh.length ? [...seen, ...fresh] : seen
}
