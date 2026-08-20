import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAnalyticsProvider } from './lib/initAnalytics'
import { reloadOnceOnStaleChunk } from './lib/chunkLoad'
import { bootstrapIncomingCallNotify } from './utils/incomingCallNotify'

initAnalyticsProvider()
bootstrapIncomingCallNotify()

// After a deploy, hashed /assets/*.js files are replaced. A tab that still
// holds the previous bundle will fail to preload the old chunks — reload once
// so the browser fetches the new index.html.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceOnStaleChunk()
})

createRoot(document.getElementById("root")!).render(<App />);
