import type { LogLine } from './state'

export default function EventLog({ lines }: { lines: LogLine[] }) {
  return (
    <section className="lr-card" aria-labelledby="lr-log-title">
      <h3 id="lr-log-title">Live events</h3>
      <ul className="lr-log" aria-live="off">
        {lines.map((line) => (
          <li key={line.id} className={line.tone}>
            {line.text}
          </li>
        ))}
        {lines.length === 0 && <li className="lr-muted">Nothing yet. Buy a game or launch a rush.</li>}
      </ul>
    </section>
  )
}
