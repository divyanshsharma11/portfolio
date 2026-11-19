import { useMemo, useState } from 'react'
import { posterBackground } from './poster'
import { arrangeGames, initials, money, stockShare, type GameSort } from './state'
import type { Game } from './types'

type Props = {
  games: Game[]
  selectedId: string
  onSelect: (gameId: string) => void
  onBuy: (gameId: string) => void
  busyGameId: string | null
}

const stockText = (game: Game) => (game.stockLeft === 0 ? 'sold out' : `${game.stockLeft} left`)

export default function Storefront({ games, selectedId, onSelect, onBuy, busyGameId }: Props) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<GameSort>('name')
  const [hideSoldOut, setHideSoldOut] = useState(false)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matching = q ? games.filter((g) => g.title.toLowerCase().includes(q)) : games
    return arrangeGames(matching, sort, hideSoldOut)
  }, [games, query, sort, hideSoldOut])
  const selected = games.find((g) => g.id === selectedId)

  return (
    <section className="lr-shop" aria-labelledby="lr-shop-title">
      <h3 id="lr-shop-title" className="lr-sr">
        Game shop
      </h3>
      <div>
        <div className="lr-tools">
          <input
            className="lr-input"
            type="search"
            placeholder={`Search ${games.length} games`}
            aria-label="Search games"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="lr-input"
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as GameSort)}
          >
            <option value="name">Name</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="stock-desc">Most in stock</option>
          </select>
          <label className="lr-check">
            <input type="checkbox" checked={hideSoldOut} onChange={(e) => setHideSoldOut(e.target.checked)} />
            Hide sold out
          </label>
        </div>
        <p className="lr-count">
          {games.length === 0 ? 'Loading the catalog…' : `${shown.length} of ${games.length} games`}
        </p>
        <ul className="lr-posters">
          {shown.map((game) => (
            <li key={game.id}>
              <button
                type="button"
                className={`lr-poster${game.id === selectedId ? ' selected' : ''}${game.stockLeft === 0 ? ' out' : ''}`}
                style={{ background: posterBackground(game.title) }}
                aria-pressed={game.id === selectedId}
                aria-label={`${game.title}, demo price ${money(game.priceMinor, game.currency)}, ${stockText(game)}`}
                onClick={() => onSelect(game.id)}
              >
                <span className="lr-initials" aria-hidden="true">
                  {initials(game.title)}
                </span>
                <span className="lr-sheen" aria-hidden="true" />
                <span className="lr-poster-meta" aria-hidden="true">
                  <span className="lr-poster-title">{game.title}</span>
                  <span className="lr-price">
                    <small>demo price</small>
                    {money(game.priceMinor, game.currency)}
                  </span>
                  <span className="lr-stock">
                    <span style={{ width: `${Math.round(stockShare(game) * 100)}%` }} />
                  </span>
                  <span className="lr-left">{stockText(game)}</span>
                </span>
              </button>
            </li>
          ))}
          {games.length > 0 && shown.length === 0 && <li className="lr-muted">No game matches.</li>}
        </ul>
      </div>

      {selected && (
        <aside className="lr-detail" aria-label={`${selected.title} details`}>
          <div className="lr-big" style={{ background: posterBackground(selected.title) }}>
            <span className="lr-initials" aria-hidden="true">
              {initials(selected.title)}
            </span>
            <h4>{selected.title}</h4>
          </div>
          <div className="lr-drow">
            <span className="lr-price big">{money(selected.priceMinor, selected.currency)}</span>
            <small>demo price</small>
          </div>
          <div className="lr-drow">
            <small>
              {selected.stockLeft === 0 ? 'sold out' : `${selected.stockLeft} of ${selected.stockTotal} left`}
            </small>
            <small>live stock</small>
          </div>
          <button
            type="button"
            className="lr-btn primary lr-buy"
            disabled={busyGameId === selected.id}
            onClick={() => onBuy(selected.id)}
          >
            {selected.stockLeft === 0 ? 'Join waitlist' : 'Buy'}
          </button>
          <p className="lr-fine">
            {selected.stockLeft === 0
              ? 'Sold out: this puts you on a numbered waitlist.'
              : 'Simulated payment. Nothing is charged, nothing is delivered.'}
          </p>
        </aside>
      )}
    </section>
  )
}
