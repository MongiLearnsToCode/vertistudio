import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { parseRendererEnv } from '@shared/env/env-schema'

parseRendererEnv(import.meta.env as Record<string, string | undefined>)

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)

document.getElementById('loading-screen')?.remove()
