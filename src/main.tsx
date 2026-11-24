import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App'

// Otomatis reload jika terjadi pembaruan versi build dan chunk hash lama 404
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

// Auto-update Service Worker tanpa perlu hard refresh / clear cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    reg.update()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        reg.update()
      }
    })
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
