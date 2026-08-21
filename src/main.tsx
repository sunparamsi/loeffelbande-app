import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { applyThemePref } from './lib/theme.ts'

// Redundant zum Inline-Script in index.html (das übernimmt den allerersten
// Render) - hier trotzdem nochmal anwenden, falls z. B. ein Service-Worker-
// Update die Seite ohne vollen Neuladevorgang ersetzt hat.
applyThemePref()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
