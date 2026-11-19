// Development harness for the launch-rush demo, served by `vite dev` at /launch-rush-demo.html. It is not part of the
// production build.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import LaunchRushDemo from './LaunchRushDemo'

const apiBase = import.meta.env.VITE_LAUNCH_RUSH_API ?? 'http://127.0.0.1:3000'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LaunchRushDemo apiBase={apiBase} />
  </StrictMode>,
)
