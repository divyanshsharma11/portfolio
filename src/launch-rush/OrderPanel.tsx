import { useState } from 'react'
import { clock, useSecondsLeft } from './countdown'
import { EMAIL_LABEL, STATE_LABEL, isPaid, shortId, type OrderView } from './state'
import type { Game } from './types'

type Props = {
  order: OrderView | undefined
  game: Game | undefined
  onPay: (orderId: string, email: string) => void
  onDuplicate: (orderId: string) => void
}

export default function OrderPanel({ order, game, onPay, onDuplicate }: Props) {
  const [email, setEmail] = useState('')
  const holdLeft = useSecondsLeft(
    order?.state === 'reserved' || order?.state === 'payment_pending' ? order.reservedUntil : null,
  )
  const waitLeft = useSecondsLeft(order?.state === 'waitlisted' ? order.waitlistUntil : null)

  return (
    <section
      className={`lr-card lr-order${order?.state === 'reserved' ? ' attention' : ''}`}
      aria-labelledby="lr-order-title"
    >
      <h3 id="lr-order-title" tabIndex={-1}>
        Your order
      </h3>
      {!order ? (
        <p className="lr-muted">Press Buy on a game. Your demo order and its invoice appear here.</p>
      ) : (
        <>
          <p className="lr-tag">Demo order · simulated payment</p>
          <dl className="lr-facts">
            <dt>Game</dt>
            <dd>{game?.title ?? '…'}</dd>
            <dt>Order #</dt>
            <dd className="lr-mono">{shortId(order.orderId)}</dd>
            <dt>State</dt>
            <dd>{STATE_LABEL[order.state]}</dd>
            <dt>Invoice #</dt>
            <dd className="lr-mono">{order.invoiceNo ?? '–'}</dd>
            <dt>Paid</dt>
            <dd>{isPaid(order.state) ? 'Yes (simulated)' : order.state === 'refunded' ? 'Refunded' : 'No'}</dd>
            <dt>Email</dt>
            <dd>{EMAIL_LABEL[order.emailStatus].replace('Email: ', '')}</dd>
          </dl>
          {holdLeft !== null && <p className="lr-note">Your copy is held for {clock(holdLeft)}.</p>}
          {order.state === 'waitlisted' && (
            <p className="lr-note">
              Sold out: you are place {order.waitlistPosition ?? '…'} in the queue
              {waitLeft !== null && `, waiting up to ${clock(waitLeft)}`}.
            </p>
          )}
          {order.state === 'reserved' && (
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
          {order.state === 'payment_pending' && (
            <button type="button" className="lr-btn" onClick={() => onPay(order.orderId, email)}>
              Press again if the payment did not start
            </button>
          )}
          {isPaid(order.state) && (
            <button type="button" className="lr-btn" onClick={() => onDuplicate(order.orderId)}>
              Duplicate: send the payment webhook again
            </button>
          )}
        </>
      )}
    </section>
  )
}
