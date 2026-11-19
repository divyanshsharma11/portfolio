import { motion, useReducedMotion } from 'framer-motion'
import type { PipelineNode } from './state'

const MARK = { idle: '○', active: '●', done: '✓', error: '✕', skipped: '–' }

export default function Pipeline({ nodes }: { nodes: PipelineNode[] }) {
  const reduce = useReducedMotion()
  return (
    <section className="lr-card lr-flow" aria-labelledby="lr-pipeline-title">
      <h3 id="lr-pipeline-title">What happens after Buy</h3>
      <ol className="lr-pipeline">
        {nodes.map((n) => (
          <li key={n.id} className={`lr-node ${n.status}`}>
            <motion.div
              className="lr-node-box"
              animate={n.status === 'active' && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={n.status === 'active' ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
            >
              <span aria-hidden="true">{MARK[n.status]}</span> {n.label} <span className="lr-sr">({n.status})</span>
            </motion.div>
            <span className="lr-muted lr-node-note">{n.note || ' '}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
