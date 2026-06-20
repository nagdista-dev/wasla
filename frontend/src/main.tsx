import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateLocalStorageKeys, migrateStorageToIndexedDB } from './utils/storageMigration'
import { LanguageProvider } from './context/LanguageContext'

migrateLocalStorageKeys();
migrateStorageToIndexedDB();
import { ThemeProvider } from './context/ThemeContext'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
import { ToastProvider } from './components/Toast'
import { MediaProvider } from './context/MediaContext'
import { PlayerProvider } from './context/PlayerContext'
import { AudioProvider } from './context/AudioContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { CoursesProvider } from './context/CoursesContext'
import { FilterProvider } from './context/FilterContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <MediaProvider>
          <PlayerProvider>
            <ToastProvider>
              <AudioProvider>
                <FavoritesProvider>
                  <CoursesProvider>
                    <FilterProvider>
                      <App />
                    </FilterProvider>
                  </CoursesProvider>
                </FavoritesProvider>
              </AudioProvider>
            </ToastProvider>
          </PlayerProvider>
        </MediaProvider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>,
)
