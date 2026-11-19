import { useCallback, useState } from 'react'
import './launch-rush.css'
import './view.css'
import EventLog from './EventLog'
import HowItWorks from './HowItWorks'
import { DISCLAIMER } from './labels'
import OrderStage from './OrderStage'
import ProofStrip from './ProofStrip'
import RushStage from './RushStage'
import Scoreboard from './Scoreboard'
import Storefront from './Storefront'
import { STATE_LABEL } from './state'
import { useLaunchRush } from './useLaunchRush'

const CONNECTION = { connecting: 'Connecting…', live: 'Live', reconnecting: 'Reconnecting…' }
type Tab = 'shop' | 'rush'

// The demo as a full-screen view inside the portfolio page (opened from the core's Launch Rush arc).
export default function LaunchRushView({ apiBase, onClose }: { apiBase: string; onClose: () => void }) {
  const { state, buy, pay, resend, startRun, setFaults, stopRun } = useLaunchRush(apiBase)
  const [tab, setTab] = useState<Tab>('shop')
  const [ordering, setOrdering] = useState(false) // the Shop tab shows the order instead of the storefront
  const [help, setHelp] = useState(false)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const closeHelp = useCallback(() => setHelp(false), [])

  const selectedId = selected || state.games[0]?.id || ''
  const current = state.orders[state.orderIds[0]]
  const gameOf = (id: string | undefined) => state.games.find((g) => g.id === id)

  async function buyGame(gameId: string, runId?: string) {
    setBusy(gameId)
    const bought = await buy(gameId, runId)
    setBusy(null)
    if (!bought) return
    setTab(runId ? 'rush' : 'shop')
    if (!runId) setOrdering(true)
  }

  return (
    <section className="lr-view" role="dialog" aria-label="Launch Rush">
      <div className="lr-view-top">
        <button className="lr-view-back" onClick={onClose}>
          ← Core
        </button>
        <span className="lr-view-title">
          <i aria-hidden="true" />
          LAUNCH RUSH
        </span>
        <span className="lr-sp" />
        <span className={`lr-conn ${state.connection}`} role="status">
          {CONNECTION[state.connection]}
        </span>
        <div className="lr-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={tab === 'shop'} onClick={() => setTab('shop')}>
            Shop
          </button>
          <button type="button" aria-pressed={tab === 'rush'} onClick={() => setTab('rush')}>
            Rush
          </button>
        </div>
        <button type="button" className="lr-view-back" aria-expanded={help} onClick={() => setHelp(true)}>
          How it works
        </button>
      </div>

      <div className="lr-view-body">
        <div className="lr-page">
          <p className="lr-disclaimer">{DISCLAIMER}</p>
          {state.notice && (
            <p className="lr-notice" role="alert">
              {state.notice}
            </p>
          )}
          <ProofStrip scoreboard={state.scoreboard} />

          <div hidden={tab !== 'shop'}>
            {ordering ? (
              <OrderStage
                order={current}
                game={gameOf(current?.gameId)}
                breakers={state.breakers}
                run={state.run}
                onPay={pay}
                onDuplicate={resend}
                onJoin={buyGame}
                onRush={() => setTab('rush')}
                onBack={() => setOrdering(false)}
              />
            ) : (
              <>
                {current && (
                  <button type="button" className="lr-yours" onClick={() => setOrdering(true)}>
                    Your latest order: {gameOf(current.gameId)?.title ?? '…'} · {STATE_LABEL[current.state]} →
                  </button>
                )}
                <Storefront
                  games={state.games}
                  selectedId={selectedId}
                  onSelect={setSelected}
                  onBuy={(id) => buyGame(id)}
                  busyGameId={busy}
                />
              </>
            )}
          </div>

          <div hidden={tab !== 'rush'}>
            <RushStage
              run={state.run}
              game={gameOf(state.run?.gameId ?? undefined)}
              selectedGame={gameOf(selectedId)}
              breakers={state.breakers}
              onStart={startRun}
              onStop={stopRun}
              onFaults={setFaults}
              onJoin={buyGame}
            />
            <div className="lr-below">
              <Scoreboard scoreboard={state.scoreboard} />
              <EventLog lines={state.log} />
            </div>
          </div>
        </div>
      </div>

      <HowItWorks open={help} onClose={closeHelp} />
    </section>
  )
}
