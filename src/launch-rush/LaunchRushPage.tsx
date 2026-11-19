import LaunchRushDemo from './LaunchRushDemo'
import { DISCLAIMER } from './labels'

const REPO = 'https://github.com/divyanshsharma11/launch-rush'

// Screenshots of a local run, kept so the page still shows something when the live demo is offline.
const SHOTS = [
  {
    file: 'launch-rush/shot-order.jpg',
    caption: 'A shop order after the simulated payment: Payment, Queue and ERP done, invoice number issued.',
  },
  {
    file: 'launch-rush/shot-rush.jpg',
    caption:
      'A rush of 500 simulated buyers for 50 copies, still running (counts of that run). The shop scoreboard does not include simulated buyers.',
  },
]
const SHOTS_DATE = '16 November 2026'

export default function LaunchRushPage({ apiBase }: { apiBase: string }) {
  return (
    <div className="lr-site">
      <div className="lr-wrap">
        <header className="lr-top">
          <a href="/">← Divyansh Sharma, portfolio</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </header>

        <section className="lr-intro">
          <p className="lr-eyebrow">Demo project</p>
          <h1>Launch-day order pipeline</h1>
          <p className="lr-lead">
            What happens after you click Buy: a live, breakable launch-day order pipeline that proves no order is
            oversold, lost or double-invoiced, even while you attack it.
          </p>

          <h2>What it shows</h2>
          <ul className="lr-points">
            <li>Stock is held atomically when you press Buy, unpaid holds expire, and late buyers join a waitlist.</li>
            <li>
              The payment provider&apos;s signed webhook is verified, de-duplicated, stored and queued, and the answer
              is sent back fast.
            </li>
            <li>A worker calls a simulated ERPNext-style ERP with retries, backoff and a circuit breaker.</li>
            <li>A reconciler recomputes the counts from the database, so the scoreboard is a check, not a claim.</li>
          </ul>

          <h2>Try it in four steps</h2>
          <ol className="lr-steps">
            <li>Pick a game and press Buy. A copy is held for you.</li>
            <li>Press Simulated payment and watch Payment, Queue, ERP and Email light up.</li>
            <li>Press Duplicate to send the same payment webhook again: still one invoice.</li>
            <li>
              Launch a rush: hundreds of simulated buyers for a few copies. Switch the ERP slow or down; when the run
              ends, its line shows oversold 0 and lost 0.
            </li>
          </ol>
        </section>

        <LaunchRushDemo apiBase={apiBase} />

        <section className="lr-section">
          <h2>What happens after Buy</h2>
          <ol className="lr-story">
            <li>Buy reserves a copy (a Redis script, so two buyers never get the last one).</li>
            <li>The mock payment provider charges and sends a signed &quot;payment succeeded&quot; webhook.</li>
            <li>
              The ingress verifies the signature on the raw body, de-duplicates by event id, saves it and queues it.
            </li>
            <li>A worker creates the Sales Order, the Sales Invoice and the Payment Entry in the simulated ERP.</li>
            <li>
              A confirmation email is sent: a real one for your own order if you gave an address, simulated otherwise.
            </li>
            <li>Paid after sold out means an automatic refund, never a silent drop.</li>
          </ol>
        </section>

        <section className="lr-section">
          <h2>See it without running it</h2>
          <p className="lr-muted">Screenshots of a local run on {SHOTS_DATE}.</p>
          <div className="lr-shots">
            {SHOTS.map((shot) => (
              <figure key={shot.file}>
                <img src={`/${shot.file}`} alt="" loading="lazy" />
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <footer className="lr-foot">
          <p>{DISCLAIMER}</p>
          <p>
            Built by Divyansh Sharma. <a href="/">Back to the portfolio</a> ·{' '}
            <a href={REPO} target="_blank" rel="noreferrer">
              Source code
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
