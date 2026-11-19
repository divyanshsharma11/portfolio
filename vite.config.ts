import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Production-only: the dev server needs inline scripts and a websocket for hot reload, so it can't run under this policy.
// vercel.json sends the same policy as a response header (plus frame-ancestors, which only works as a header):
// change both together.
// The launch-rush demo page and its backend origin are added only when VITE_LAUNCH_RUSH_API is set for the build
// (see data.ts). It must be a bare origin such as http://127.0.0.1:3000.
const demoApi = loadEnv('production', '.', 'VITE_').VITE_LAUNCH_RUSH_API
if (demoApi && !/^https?:\/\/[^/?#\s;,@]+$/i.test(demoApi)) {
  throw new Error('VITE_LAUNCH_RUSH_API must be an origin such as http://127.0.0.1:3000 (no path or trailing slash)')
}
const demoOrigin = demoApi ? ` ${demoApi}` : ''
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // framer-motion and the SVG wires set inline styles
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' https://api.github.com${demoOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-csp',
      apply: 'build',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      ],
    },
  ],
  ...(demoApi ? { build: { rollupOptions: { input: ['index.html', 'launch-rush.html'] } } } : {}),
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
