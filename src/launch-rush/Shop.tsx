import { useMemo, useState } from 'react'
import { DISCLAIMER } from './labels'
import { arrangeGames, initials, money, stockShare, tileHue, type GameSort } from './state'
import type { Game } from './types'

type Props = {
  games: Game[]
  selectedId: string
  onSelect: (gameId: string) => void
  onBuy: (gameId: string) => void
  busyGameId: string | null
}

export default function Shop({ games, selectedId, onSelect, onBuy, busyGameId }: Props) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<GameSort>('name')
  const [hideSoldOut, setHideSoldOut] = useState(false)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matching = q ? games.filter((g) => g.title.toLowerCase().includes(q)) : games
    return arrangeGames(matching, sort, hideSoldOut)
  }, [games, query, sort, hideSoldOut])

  return (
    <section className="lr-card lr-shop" aria-labelledby="lr-shop-title">
      <h3 id="lr-shop-title">Game shop</h3>
      <p className="lr-muted">Demo prices. Stock is live; the copy is held for you when you press Buy.</p>
      <p className="lr-muted">{DISCLAIMER}</p>
      <input
        className="lr-input"
        type="search"
        placeholder={`Search ${games.length} games`}
        aria-label="Search games"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="lr-row">
        <label className="lr-field wide">
          <span className="lr-muted">Sort by</span>
          <select className="lr-input" value={sort} onChange={(e) => setSort(e.target.value as GameSort)}>
            <option value="name">Name</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="stock-desc">Most in stock</option>
          </select>
        </label>
        <label className="lr-check">
          <input type="checkbox" checked={hideSoldOut} onChange={(e) => setHideSoldOut(e.target.checked)} />
          Hide sold out
        </label>
      </div>
      <ul className="lr-games">
        {shown.map((game) => {
          const soldOut = game.stockLeft === 0
          return (
            <li key={game.id} className={game.id === selectedId ? 'selected' : ''}>
              <span
                className="lr-tile"
                aria-hidden="true"
                style={{ background: `hsl(${tileHue(game.title)} 40% 24%)` }}
              >
                {initials(game.title)}
              </span>
              <button
                type="button"
                className="lr-game"
                onClick={() => onSelect(game.id)}
                aria-pressed={game.id === selectedId}
              >
                <span className="lr-game-title">{game.title}</span>
                <span className="lr-muted">
                  demo price {money(game.priceMinor, game.currency)} · {soldOut ? 'sold out' : `${game.stockLeft} left`}
                </span>
                <span className="lr-stock" aria-hidden="true">
                  <span style={{ width: `${Math.round(stockShare(game) * 100)}%` }} />
                </span>
              </button>
              <button
                type="button"
                className="lr-btn"
                aria-label={`${soldOut ? 'Join waitlist for' : 'Buy'} ${game.title}`}
                disabled={busyGameId === game.id}
                onClick={() => onBuy(game.id)}
              >
                {soldOut ? 'Join waitlist' : 'Buy'}
              </button>
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="lr-muted">{games.length === 0 ? 'Loading the catalog…' : 'No game matches.'}</li>
        )}
      </ul>
    </section>
  )
}
