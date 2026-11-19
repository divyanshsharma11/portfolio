import { useEffect, useRef, useState } from 'react'
import { clock, useSecondsLeft } from './countdown'
import Journey from './Journey'
import { EMAIL_LABEL, STATE_LABEL, isPaid, shortId, type OrderView, type RunView } from './state'
import type { BreakerState, Game } from './types'

type Props = {
  order: OrderView | undefined
  game: Game | undefined
  breakers: Record<string, BreakerState>
  run: RunView | null
  onPay: (orderId: string, email: string) => void
  onDuplicate: (orderId: string) => Promise<unknown>
  onJoin: (gameId: string, runId: string) => void
  onRush: () => void
  onBack: () => void
}

// One order from Buy to receipt: the ticket on its way through the five stops, and what the visitor can do next.
export default function OrderStage({ order, game, breakers, run, onPay, onDuplicate, onJoin, onRush, onBack }: Props) {
  const [email, setEmail] = useState('')
  const [stamped, setStamped] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const holdLeft = useSecondsLeft(
    order?.state === 'reserved' || order?.state === 'payment_pending' ? order.reservedUntil : null,
  )
  const waitLeft = useSecondsLeft(order?.state === 'waitlisted' ? order.waitlistUntil : null)
  const liveRun = run && run.ended === null && run.gameId ? run : null

  // After Buy the eyes should be on the order.
  useEffect(() => heading.current?.focus({ preventScroll: true }), [])

  async function duplicate(orderId: string) {
    setStamped(false)
    if ((await onDuplicate(orderId)) !== undefined) setStamped(true) // a refused request comes back undefined
  }

  return (
    <section className="lr-journey" aria-labelledby="lr-order-title">
      <div className="lr-jhead">
        <h3 id="lr-order-title" tabIndex={-1} ref={heading}>
          {game?.title ?? 'Your order'}
        </h3>
        <span className="lr-tag">Demo order</span>
        {order && <span className="lr-tag">{STATE_LABEL[order.state]}</span>}
        {order && <span className="lr-tag mono">#{shortId(order.orderId)}</span>}
        <span className="lr-sp" />
        {stamped && <span className="lr-stamp">DUPLICATE SENT · still one invoice</span>}
      </div>

      <Journey key={order?.orderId} order={order} breakers={breakers} game={game} />

      {holdLeft !== null && <p className="lr-note">Your copy is held for {clock(holdLeft)}.</p>}
      {order?.state === 'waitlisted' && (
        <p className="lr-note">
          Sold out: you are place {order.waitlistPosition ?? '…'} in the queue
          {waitLeft !== null && `, waiting up to ${clock(waitLeft)}`}.
        </p>
      )}

      {order?.state === 'failed' && order.failedFrom && (
        <p className="lr-note">
          {order.failedFrom === 'refund_pending'
            ? 'The refund failed after its retries, so the order is kept for an admin to replay.'
            : 'Your payment is recorded. The ERP step failed after its retries, so the order is kept for an admin to replay.'}
        </p>
      )}

      {order?.state === 'reserved' && (
        <form
          className="lr-pay"
          onSubmit={(e) => {
            e.preventDefault()
            onPay(order.orderId, email)
          }}
        >
          <label>
            <span className="lr-muted">Email for one real confirmation (optional)</span>
            <input
              className="lr-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <p className="lr-muted">The address is deleted after 24 hours. No card fields: nothing is charged.</p>
          <button type="submit" className="lr-btn primary">
            Simulated payment
          </button>
        </form>
      )}
      {order?.state === 'payment_pending' && (
        <button type="button" className="lr-btn" onClick={() => onPay(order.orderId, email)}>
          Press again if the payment did not start
        </button>
      )}

      {order?.invoiceNo && (
        <div className="lr-receipt">
          <div>
            Invoice <b>{order.invoiceNo}</b>
          </div>
          <span className="lr-tag ok">Simulated payment</span>
          <span className="lr-tag ok">{EMAIL_LABEL[order.emailStatus]}</span>
        </div>
      )}

      <div className="lr-acts">
        <button
          type="button"
          className="lr-btn"
          disabled={!order || !isPaid(order.state)}
          onClick={() => order && duplicate(order.orderId)}
        >
          Send the payment webhook again
        </button>
        {liveRun ? (
          <button type="button" className="lr-btn" onClick={() => onJoin(liveRun.gameId as string, liveRun.runId)}>
            Join the live rush →
          </button>
        ) : (
          <button type="button" className="lr-btn" onClick={onRush}>
            Go to the rush →
          </button>
        )}
        <button type="button" className="lr-btn" onClick={onBack}>
          ← Back to the shop
        </button>
      </div>
    </section>
  )
}
