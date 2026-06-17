import { useState, useEffect } from 'react'
import { AccountInfo } from '@azure/msal-browser'
import { msalInstance, signIn, signOut, getCurrentUser } from '../lib/b2cAuth'

export function useAuth() {
  const [user, setUser] = useState<AccountInfo | null>(getCurrentUser())

  useEffect(() => {
    // Listen for account changes
    const callbackId = msalInstance.addEventCallback(() => {
      setUser(getCurrentUser())
    })
    return () => {
      if (callbackId) msalInstance.removeEventCallback(callbackId)
    }
  }, [])

  return {
    user,
    isAuthenticated: user !== null,
    signIn: async () => {
      await signIn()
      setUser(getCurrentUser())
    },
    signOut: async () => {
      await signOut()
      setUser(null)
    }
  }
}
