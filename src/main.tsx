import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LifeOSProvider } from './context/LifeOSContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LifeOSProvider>
      <App />
    </LifeOSProvider>
  </StrictMode>,
)