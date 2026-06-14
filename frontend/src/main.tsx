import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateStorage } from './utils/storageMigration'
import { LanguageProvider } from './context/LanguageContext'

migrateStorage();
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/Toast'
import { PlayerProvider } from './context/PlayerContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <PlayerProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PlayerProvider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>,
)
