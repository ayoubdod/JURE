import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAnalyticsProvider } from './lib/initAnalytics'
import { bootstrapIncomingCallNotify } from './utils/incomingCallNotify'

initAnalyticsProvider()
bootstrapIncomingCallNotify()

createRoot(document.getElementById("root")!).render(<App />);
