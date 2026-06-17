import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { msalInstance } from './lib/b2cAuth'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 }
  }
})

// MSAL must be initialised and redirect promise resolved before rendering,
// so getCurrentUser() is populated when RequireAuth runs on first render
msalInstance.initialize().then(async () => {
  await msalInstance.handleRedirectPromise().catch(console.error)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
})
