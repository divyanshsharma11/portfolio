import type { Scoreboard } from './types'

// The proof the page is about, shown first: each count must stay at zero.
export default function ProofStrip({ scoreboard }: { scoreboard: Scoreboard | null }) {
  if (!scoreboard) {
    return <p className="lr-muted lr-proof-wait">Proof scoreboard: waiting for the first reconciliation check.</p>
  }
  const checks = [
    { label: 'Oversold', value: scoreboard.oversold },
    { label: 'Orders lost', value: scoreboard.lost },
    { label: 'Paid, not invoiced or refunded', value: scoreboard.paidNotInvoicedOrRefunded },
    { label: 'Stock mismatches', value: scoreboard.stockMismatches.length },
  ]
  return (
    <section className="lr-proof" aria-label="Proof scoreboard">
      {checks.map((check) => (
        <div key={check.label} className={check.value === 0 ? 'lr-ok' : 'lr-err'}>
          <b>{check.value}</b>
          <span>{check.label}</span>
        </div>
      ))}
      <div>
        <b>{scoreboard.duplicatesBlocked}</b>
        <span>Duplicates blocked</span>
      </div>
    </section>
  )
}
