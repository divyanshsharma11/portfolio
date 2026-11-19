import { useMemo, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { posterBackground } from './poster'
import { currentStop, journeyOf, type JourneyStop } from './stops'
import { initials, type OrderView } from './state'
import type { BreakerState, Game } from './types'

const icon = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

const ICON: Record<JourneyStop['id'], ReactNode> = {
  hold: icon(
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
  ),
  payment: icon(
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>,
  ),
  queue: icon(
    <>
      <path d="M4 13l2-7h12l2 7v5H4z" />
      <path d="M4 13h5l1 2h4l1-2h5" />
    </>,
  ),
  erp: icon(
    <>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4M10 12h6M10 16h6" />
    </>,
  ),
  email: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>,
  ),
}

// The five stops of one order, with the order's ticket on the stop it has reached. Each stop can be opened to see why it
// exists; by default the stop in progress is shown. Render with key={orderId} so the choice starts afresh per order.
export default function Journey({
  order,
  breakers,
  game,
}: {
  order: OrderView | undefined
  breakers: Record<string, BreakerState>
  game: Game | undefined
}) {
  const reduce = useReducedMotion()
  const [picked, setPicked] = useState<JourneyStop['id'] | null>(null)
  const stops = useMemo(() => journeyOf(order, breakers), [order, breakers])
  const current = currentStop(stops)
  const shown = stops.find((s) => s.id === picked) ?? current
  const at = stops.indexOf(current)

  return (
    <>
      <div className="lr-routebox">
        <div className="lr-wire" aria-hidden="true">
          <i style={{ width: `${(at / (stops.length - 1)) * 100}%` }} />
        </div>
        <div
          className="lr-ticket"
          aria-hidden="true"
          style={{
            left: `calc(${(at + 0.5) * (100 / stops.length)}% - 27px)`,
            background: posterBackground(game?.title ?? ''),
          }}
        >
          {game ? initials(game.title) : ''}
        </div>
        <ol className="lr-route">
          {stops.map((s) => (
            <li key={s.id} className={`lr-node ${s.status}`}>
              <motion.button
                type="button"
                className="lr-node-box"
                aria-pressed={s.id === shown.id}
                onClick={() => setPicked(s.id)}
                animate={s.status === 'active' && !reduce ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                transition={s.status === 'active' ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
              >
                {ICON[s.id]}
                <span className="lr-sr">
                  {s.label} ({s.status})
                </span>
              </motion.button>
              <h5>{s.label}</h5>
              <p>{s.note}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="lr-why" role="status">
        <p>
          <b>{shown.label}: why?</b> {shown.why}
        </p>
      </div>
    </>
  )
}
