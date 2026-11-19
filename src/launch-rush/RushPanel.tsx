import { useState } from 'react'
import { RUN_LABEL, RUSH_BANNER } from './labels'
import type { RunView } from './state'
import type { Game } from './types'

type Props = {
  run: RunView | null
  game: Game | undefined
  selectedId: string
  onStart: (gameId: string, buyers: number, stock: number) => void
  onStop: () => void
  onFaults: (change: { latencyMs?: number; down?: boolean }) => void
  onJoin: (gameId: string, runId: string) => void
}

const SLOW_MS = 2000

export default function RushPanel({ run, game, selectedId, onStart, onStop, onFaults, onJoin }: Props) {
  const [buyers, setBuyers] = useState(500)
  const [stock, setStock] = useState(50)
  const live = run !== null && run.ended === null
  const progress = run?.progress

  return (
    <section className="lr-card lr-rush" aria-labelledby="lr-rush-title">
      <h3 id="lr-rush-title">Launch rush</h3>
      <p className="lr-note">{RUSH_BANNER}</p>
      <p className="lr-muted">{RUN_LABEL}</p>

      {!live && (
        <form
          className="lr-row"
          onSubmit={(e) => {
            e.preventDefault()
            if (selectedId) onStart(selectedId, buyers, stock)
          }}
        >
          <label className="lr-field">
            <span className="lr-muted">Buyers</span>
            <input
              className="lr-input"
              type="number"
              min={1}
              max={500}
              value={buyers}
              onChange={(e) => setBuyers(Number(e.target.value))}
            />
          </label>
          <label className="lr-field">
            <span className="lr-muted">Stock</span>
            <input
              className="lr-input"
              type="number"
              min={1}
              max={buyers}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="lr-btn primary" disabled={!selectedId}>
            Launch rush
          </button>
        </form>
      )}

      {!live && (
        <div className="lr-row">
          <label className="lr-check">
            <input type="checkbox" disabled />
            ERP slow
          </label>
          <label className="lr-check">
            <input type="checkbox" disabled />
            ERP down
          </label>
          <span className="lr-muted">Break it: switch these on while a rush is running.</span>
        </div>
      )}

      {live && (
        <div className="lr-row">
          <label className="lr-check">
            <input
              type="checkbox"
              checked={run.faults.latencyMs > 0}
              onChange={(e) => onFaults({ latencyMs: e.target.checked ? SLOW_MS : 0 })}
            />
            ERP slow
          </label>
          <label className="lr-check">
            <input type="checkbox" checked={run.faults.down} onChange={(e) => onFaults({ down: e.target.checked })} />
            ERP down
          </label>
          <button type="button" className="lr-btn" onClick={onStop}>
            Stop
          </button>
          {run.gameId && (
            <button type="button" className="lr-btn" onClick={() => onJoin(run.gameId as string, run.runId)}>
              Join the rush{game ? `: ${game.title}` : ''}
            </button>
          )}
        </div>
      )}

      {progress && (
        <dl className="lr-facts lr-funnel">
          <dt>Reserved</dt>
          <dd>{progress.reserved}</dd>
          <dt>Waitlisted</dt>
          <dd>{progress.waitlisted}</dd>
          <dt>Paid</dt>
          <dd>{progress.paid}</dd>
          <dt>Invoiced</dt>
          <dd>{progress.invoiced}</dd>
          <dt>Refunded</dt>
          <dd>{progress.refunded}</dd>
          <dt>Duplicates blocked</dt>
          <dd>{progress.duplicatesBlocked}</dd>
          <dt>In flight</dt>
          <dd>{progress.inFlight}</dd>
          <dt>Stock left</dt>
          <dd>{progress.soldOut ? 'sold out' : progress.stockLeft}</dd>
        </dl>
      )}
      {run?.ended && (
        <p className={run.ended.oversold === 0 && run.ended.lost === 0 ? 'lr-note ok' : 'lr-note err'}>
          Run {run.ended.status}: sold {run.ended.sold} of {run.ended.stockTotal}, oversold {run.ended.oversold}, lost{' '}
          {run.ended.lost}.
        </p>
      )}
    </section>
  )
}
