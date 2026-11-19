import type { Scoreboard as ScoreboardData } from './types'

export default function Scoreboard({ scoreboard }: { scoreboard: ScoreboardData | null }) {
  const clean =
    scoreboard && scoreboard.oversold === 0 && scoreboard.lost === 0 && scoreboard.stockMismatches.length === 0
  return (
    <section className="lr-card" aria-labelledby="lr-score-title">
      <h3 id="lr-score-title">Scoreboard</h3>
      {!scoreboard ? (
        <p className="lr-muted">Waiting for the first reconciliation check.</p>
      ) : (
        <>
          <dl className="lr-facts">
            <dt>Sold</dt>
            <dd>{scoreboard.sold}</dd>
            <dt>Stock</dt>
            <dd>{scoreboard.stock}</dd>
            <dt>Oversold</dt>
            <dd className={scoreboard.oversold === 0 ? 'lr-ok' : 'lr-err'}>{scoreboard.oversold}</dd>
            <dt>Orders lost</dt>
            <dd className={scoreboard.lost === 0 ? 'lr-ok' : 'lr-err'}>{scoreboard.lost}</dd>
            <dt>Paid, not yet invoiced or refunded</dt>
            <dd>{scoreboard.paidNotInvoicedOrRefunded}</dd>
            <dt>Duplicates blocked</dt>
            <dd>{scoreboard.duplicatesBlocked}</dd>
          </dl>
          <p className="lr-muted">
            {clean ? 'Reconciled: counts match.' : 'Counts do not match yet.'} Checked{' '}
            {new Date(scoreboard.checkedAt).toLocaleTimeString()}.
          </p>
        </>
      )}
    </section>
  )
}
