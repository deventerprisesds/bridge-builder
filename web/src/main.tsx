import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { msalInstance, setCachedToken } from './lib/b2cAuth'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
})

// MSAL must be initialised and redirect promise resolved before rendering,
// so getCurrentUser() is populated when RequireAuth runs on first render
msalInstance.initialize().then(async () => {
  const redirectResult = await msalInstance.handleRedirectPromise().catch(console.error)
  if (redirectResult?.idToken) setCachedToken(redirectResult.idToken)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
})
