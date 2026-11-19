// Entry of the launch-rush page (/launch-rush.html). The production build includes it only when VITE_LAUNCH_RUSH_API is
// set (vite.config.ts); `vite dev` always serves it and falls back to a backend on this PC.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/jetbrains-mono'
import '../index.css'
import ErrorBoundary from '../components/ErrorBoundary'
import LaunchRushPage from './LaunchRushPage'

const apiBase = import.meta.env.VITE_LAUNCH_RUSH_API || 'http://127.0.0.1:3000'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LaunchRushPage apiBase={apiBase} />
    </ErrorBoundary>
  </StrictMode>,
)
