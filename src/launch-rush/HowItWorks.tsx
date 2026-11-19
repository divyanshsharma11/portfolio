import { useEffect, useRef } from 'react'

// Side drawer with the short story of what happens after Buy. Esc closes it before it closes the whole view.
export default function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation() // capture phase: the page's own Esc handler must not also leave the view
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  return (
    <aside className={`lr-drawer${open ? ' open' : ''}`} aria-label="How it works">
      <button type="button" className="lr-btn lr-drawer-close" ref={close} onClick={onClose}>
        Close
      </button>
      <h3>How it works</h3>
      <ol>
        <li>Buy holds a copy with one atomic Redis script, so two buyers never get the last one.</li>
        <li>The payment provider sends a signed webhook. It is verified, de-duplicated, saved and queued.</li>
        <li>
          A worker creates the Sales Order, Sales Invoice and Payment Entry in the simulated ERP, with retries and a
          circuit breaker.
        </li>
        <li>A reconciler recomputes the proof counts from the database.</li>
      </ol>
    </aside>
  )
}
