import { useEffect, useState } from 'react'

// Seconds left until a time, ticking every second; null when there is no time.
export function useSecondsLeft(until: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return until ? Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000)) : null
}

export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
