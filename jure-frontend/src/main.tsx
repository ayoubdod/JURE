import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAnalyticsProvider } from './lib/initAnalytics'

initAnalyticsProvider()

createRoot(document.getElementById("root")!).render(<App />);
