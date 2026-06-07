import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ContestantAuthProvider } from './hooks/useContestantAuth'
import { AdminAuthProvider } from './hooks/useAuth'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <ContestantAuthProvider>
          <App />
        </ContestantAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
