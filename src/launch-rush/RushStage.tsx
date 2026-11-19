import { useEffect, useState } from 'react'
import { clock, useSecondsLeft } from './countdown'
import { RUN_LABEL, RUSH_BANNER } from './labels'
import { CHAPTERS, addReached, chaptersNow, type ChapterId } from './rush'
import { breakerKey, type RunView } from './state'
import type { BreakerState, Game } from './types'

type Props = {
  run: RunView | null
  game: Game | undefined
  selectedGame: Game | undefined
  breakers: Record<string, BreakerState>
  onStart: (gameId: string, buyers: number, stock: number) => void
  onStop: () => void
  onFaults: (change: { latencyMs?: number; down?: boolean }) => void
  onJoin: (gameId: string, runId: string) => void
}

const SLOW_MS = 2000
const MAX_DOTS = 120

// One dot per order in the zone, as many as the run's counter says (the stream carries counts, not individual buyers).
function Dots({ count, tone }: { count: number; tone: string }) {
  return (
    <div className="lr-zd" aria-hidden="true">
      {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => (
        <i key={i} className={tone} />
      ))}
      {count > MAX_DOTS && <em>+{count - MAX_DOTS} more</em>}
    </div>
  )
}

function Zone({ title, count, tone, note }: { title: string; count: number; tone: string; note?: string }) {
  return (
    <div className="lr-zone">
      <div className="lr-zh">
        <span>{title}</span>
        <b>{count}</b>
      </div>
      <Dots count={count} tone={tone} />
      {note && <div className="lr-zn">{note}</div>}
    </div>
  )
}

// What the run's counters say has happened, chapter by chapter. Render with key={runId}: a new run starts afresh.
function Narrator({ run, breaker }: { run: RunView; breaker: BreakerState | undefined }) {
  const [seen, setSeen] = useState<ChapterId[]>([])
  const [picked, setPicked] = useState<ChapterId | null>(null)
  const [detail, setDetail] = useState(false)
  const reached = chaptersNow({ progress: run.progress, breaker, ended: run.ended !== null }).join()
  useEffect(() => {
    setSeen((s) => addReached(s, reached ? (reached.split(',') as ChapterId[]) : []))
  }, [reached])

  const shown = CHAPTERS.find((c) => c.id === (picked ?? seen[seen.length - 1]))
  return (
    <>
      <div className="lr-chips" role="group" aria-label="What has happened in this run">
        {CHAPTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`lr-cp${seen.includes(c.id) ? ' on' : ''}`}
            aria-pressed={c.id === shown?.id}
            disabled={!seen.includes(c.id)}
            onClick={() => setPicked(c.id)}
          >
            {c.chip}
          </button>
        ))}
      </div>
      <div className="lr-narr">
        <span className="lr-nlabel">WHAT IS HAPPENING</span>
        <p role="status">
          {shown ? shown.text : 'Buyers are arriving. What happens to them is explained here as it happens.'}
        </p>
        {shown && (
          <button type="button" className="lr-btn" aria-expanded={detail} onClick={() => setDetail((d) => !d)}>
            Why?
          </button>
        )}
        {shown && detail && <div className="lr-ndetail">{shown.why}</div>}
      </div>
    </>
  )
}

export default function RushStage({ run, game, selectedGame, breakers, onStart, onStop, onFaults, onJoin }: Props) {
  const [buyers, setBuyers] = useState(500)
  const [stock, setStock] = useState(50)
  const [touched, setTouched] = useState(false)
  const live = run !== null && run.ended === null
  const progress = run?.progress
  const ended = run?.ended
  const breaker = run ? breakers[breakerKey('erp-sim', run.runId)] : undefined
  const left = useSecondsLeft(live ? run.endsAt : null)
  const slow = !!run && run.faults.latencyMs > 0
  const down = !!run && run.faults.down
  const tip = live && (progress?.invoiced ?? 0) > 0 && !touched && !down

  const changeFaults = (change: { latencyMs?: number; down?: boolean }) => {
    setTouched(true)
    onFaults(change)
  }

  return (
    <section aria-labelledby="lr-rush-title">
      {run ? (
        <Narrator key={run.runId} run={run} breaker={breaker} />
      ) : (
        <div className="lr-narr">
          <span className="lr-nlabel">WHAT IS HAPPENING</span>
          <p role="status">Launch a rush to watch what happens when hundreds of buyers want a few copies.</p>
        </div>
      )}

      <div className="lr-rush">
        <div className="lr-dots">
          <div className="lr-dhead">
            <h3 id="lr-rush-title">
              Rush: {ended ? ended.buyersRequested : buyers} simulated buyers for {ended ? ended.stockTotal : stock}{' '}
              copies
            </h3>
            {left !== null && <span className="lr-tag mono">ends in {clock(left)}</span>}
          </div>
          <p className="lr-fine">{RUSH_BANNER}</p>
          <p className="lr-fine">{RUN_LABEL}</p>

          {progress ? (
            <>
              <div className="lr-zrow">
                <Zone title="Holding a copy (30 s)" count={progress.reserved} tone="held" />
                <Zone title="Waitlist, in order" count={progress.waitlisted} tone="wait" />
                <Zone title="Sold (paid)" count={progress.paid} tone="sold" note={`${progress.invoiced} invoiced`} />
                <Zone title="Refunded" count={progress.refunded} tone="ref" />
              </div>
              <div className="lr-gone">
                <span>
                  Stock left <b>{progress.soldOut ? 'none' : progress.stockLeft}</b>
                </span>
                <span>
                  Holds expired <b>{progress.expired}</b>
                </span>
                <span>
                  Waits ended <b>{progress.waitlistEnded}</b>
                </span>
                <span>
                  In flight <b>{progress.inFlight}</b>
                </span>
                {progress.failed > 0 && (
                  <span className="lr-err">
                    Failed <b>{progress.failed}</b>
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="lr-muted">No rush yet. Press Launch rush.</p>
          )}

          {ended && (
            <div className={`lr-summary ${ended.oversold === 0 && ended.lost === 0 ? 'ok' : 'err'}`}>
              <b>What just happened</b>
              <ul>
                <li>
                  {ended.buyersRequested} buyers, {ended.stockTotal} copies: sold {ended.sold} · invoiced{' '}
                  {ended.invoiced} · oversold {ended.oversold} · lost {ended.lost}
                </li>
                <li>{ended.expired} holds expired without payment and were passed on</li>
                <li>{ended.refunded} late payers refunded automatically</li>
                <li>{ended.waitlistEnded} waited until the run ended with no copy</li>
                <li>{ended.duplicatesBlocked} duplicate payment messages blocked</li>
              </ul>
              <p className="lr-fine">
                Run {ended.status}. Oversold and lost come from the run&apos;s final check against the database.
              </p>
            </div>
          )}
          <p className="lr-fine lr-legend">
            Each dot is one order in that state, drawn from the run&apos;s live counts.
          </p>
        </div>

        <div className="lr-side">
          <form
            className="lr-card"
            onSubmit={(e) => {
              e.preventDefault()
              if (selectedGame) {
                setTouched(false)
                onStart(selectedGame.id, buyers, stock)
              }
            }}
          >
            <h4>The scenario</h4>
            <p className="lr-fine">
              Simulated buyers all press Buy within about 10 seconds. Holds last 30 seconds here.
            </p>
            <p className="lr-fine">
              Game: <b>{(live ? game : selectedGame)?.title ?? '…'}</b>
              {!live && ' (pick another in the Shop tab)'}
            </p>
            <div className="lr-row">
              <label className="lr-field">
                <span className="lr-muted">Buyers</span>
                <input
                  className="lr-input"
                  type="number"
                  min={1}
                  max={500}
                  disabled={live}
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
                  disabled={live}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                />
              </label>
            </div>
            <button type="submit" className="lr-btn primary lr-buy" disabled={live || !selectedGame}>
              Launch rush
            </button>
            {live && (
              <div className="lr-row">
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
          </form>

          <div className="lr-card">
            <h4>Live counts</h4>
            <div className="lr-stats">
              <div>
                <b>{progress?.paid ?? 0}</b>
                <span>sold (paid)</span>
              </div>
              <div>
                <b>{progress?.invoiced ?? 0}</b>
                <span>invoiced</span>
              </div>
              <div>
                <b>{progress?.refunded ?? 0}</b>
                <span>refunded</span>
              </div>
              <div>
                <b>{progress?.duplicatesBlocked ?? 0}</b>
                <span>duplicates blocked</span>
              </div>
              <div>
                <b>{progress?.waitlisted ?? 0}</b>
                <span>on the waitlist</span>
              </div>
              <div>
                <b>{progress?.expired ?? 0}</b>
                <span>holds expired</span>
              </div>
            </div>
          </div>

          <div className={`lr-card${tip ? ' tip-on' : ''}`}>
            <h4>Break it</h4>
            <div className="lr-tog">
              <span id="lr-sw-slow">ERP slow</span>
              <button
                type="button"
                role="switch"
                aria-checked={slow}
                aria-labelledby="lr-sw-slow"
                className={`lr-sw${slow ? ' on' : ''}`}
                disabled={!live}
                onClick={() => changeFaults({ latencyMs: slow ? 0 : SLOW_MS })}
              />
            </div>
            <div className="lr-tog">
              <span id="lr-sw-down">ERP down</span>
              <button
                type="button"
                role="switch"
                aria-checked={down}
                aria-labelledby="lr-sw-down"
                className={`lr-sw${down ? ' on' : ''}`}
                disabled={!live}
                onClick={() => changeFaults({ down: !down })}
              />
            </div>
            <div className="lr-mini">
              <span className={down ? 'err' : ''}>ERP: {down ? 'down' : slow ? 'slow' : 'healthy'}</span>
              <span className={breaker === 'open' ? 'err' : ''}>breaker: {breaker ?? 'closed'}</span>
            </div>
            <p className="lr-fine">
              {!live
                ? 'Switch these on while a rush is running.'
                : down
                  ? 'Paid orders wait in the queue while the ERP is down, and are not dropped.'
                  : tip
                    ? 'Try it: switch ERP down while orders are being invoiced.'
                    : 'Break the simulated ERP and watch what protects the orders.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
