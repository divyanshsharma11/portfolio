import { useMemo, useState } from 'react'
import './launch-rush.css'
import EventLog from './EventLog'
import { DISCLAIMER } from './labels'
import OrderPanel from './OrderPanel'
import Pipeline from './Pipeline'
import ProofStrip from './ProofStrip'
import RushPanel from './RushPanel'
import Scoreboard from './Scoreboard'
import Shop from './Shop'
import { pipelineOf } from './state'
import { useLaunchRush } from './useLaunchRush'

const CONNECTION = { connecting: 'Connecting…', live: 'Live', reconnecting: 'Reconnecting…' }

export default function LaunchRushDemo({ apiBase }: { apiBase: string }) {
  const { state, buy, pay, resend, startRun, setFaults, stopRun } = useLaunchRush(apiBase)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const selectedId = selected || state.games[0]?.id || ''
  const current = state.orders[state.orderIds[0]]
  const nodes = useMemo(() => pipelineOf(current, state.breakers), [current, state.breakers])
  const gameOf = (id: string | undefined) => state.games.find((g) => g.id === id)

  // After Buy the eyes should be on the order, which on a phone is below the shop.
  function showOrder() {
    const heading = document.getElementById('lr-order-title')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heading?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' })
    heading?.focus({ preventScroll: true })
  }

  async function buyGame(gameId: string, runId?: string) {
    setBusy(gameId)
    const bought = await buy(gameId, runId)
    setBusy(null)
    if (bought && !runId) showOrder()
  }

  return (
    <div className="lr-page">
      <header className="lr-header">
        <h2>Live demo</h2>
        <span className={`lr-conn ${state.connection}`} role="status">
          {CONNECTION[state.connection]}
        </span>
      </header>
      <p className="lr-disclaimer">{DISCLAIMER}</p>
      {state.notice && (
        <p className="lr-notice" role="alert">
          {state.notice}
        </p>
      )}
      <ProofStrip scoreboard={state.scoreboard} />
      <Pipeline nodes={nodes} />
      <div className="lr-grid">
        <Shop
          games={state.games}
          selectedId={selectedId}
          onSelect={setSelected}
          onBuy={(id) => buyGame(id)}
          busyGameId={busy}
        />
        <div className="lr-stack">
          <OrderPanel order={current} game={gameOf(current?.gameId)} onPay={pay} onDuplicate={resend} />
        </div>
        <div className="lr-stack">
          <RushPanel
            run={state.run}
            game={gameOf(state.run?.gameId ?? undefined)}
            selectedId={selectedId}
            onStart={startRun}
            onStop={stopRun}
            onFaults={setFaults}
            onJoin={buyGame}
          />
          <Scoreboard scoreboard={state.scoreboard} />
        </div>
      </div>
      <EventLog lines={state.log} />
    </div>
  )
}
