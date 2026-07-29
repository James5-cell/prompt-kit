import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { addCollection } from '@iconify/react'
import riData from '@iconify-json/ri/icons.json'
import './index.css'
import App from './App.tsx'

// Pre-bundle RemixIcon locally — no runtime network requests
addCollection(riData)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
