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

// MSAL must be initialised before any component that calls auth methods
msalInstance.initialize().then(() => {
  // Handle redirect callback — resolves with AuthenticationResult after login redirect returns
  msalInstance.handleRedirectPromise().then((result) => {
    if (result?.account) {
      // Redirect login just completed — go to dashboard
      window.location.replace('/')
    }
  }).catch(console.error)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
})
