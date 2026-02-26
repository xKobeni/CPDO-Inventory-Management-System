import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import { router } from './app/router.jsx'
import { fetchCsrfToken } from '@/lib/http'
import { initSentry } from '@/lib/sentry'

// Initialize error monitoring
initSentry().catch(err => {
  console.error('Failed to initialize Sentry:', err)
})

// Fetch CSRF token on app initialization
fetchCsrfToken().catch(err => {
  console.error('Failed to initialize CSRF protection:', err)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-center" closeButton />
  </StrictMode>,
)
