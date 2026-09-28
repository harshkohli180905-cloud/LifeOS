import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LifeOSProvider } from './context/LifeOSContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LifeOSProvider>
        <App />
      </LifeOSProvider>
    </AuthProvider>
  </StrictMode>,
)