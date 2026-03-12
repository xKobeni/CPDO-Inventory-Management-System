import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import { router } from './app/router.jsx'
import { initSentry } from '@/lib/sentry'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Initialize error monitoring
initSentry().catch(err => {
  console.error('Failed to initialize Sentry:', err)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" closeButton />
    </ThemeProvider>
  </StrictMode>,
)
