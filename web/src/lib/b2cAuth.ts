// Entra External ID (CIAM) — replaces Azure AD B2C
// Uses ciamlogin.com instead of b2clogin.com
import {
  PublicClientApplication,
  Configuration,
  AccountInfo,
  AuthenticationResult
} from '@azure/msal-browser'

const tenantName   = import.meta.env.VITE_ENTRA_TENANT_NAME as string
const tenantDomain = `${tenantName}.onmicrosoft.com`
const clientId     = import.meta.env.VITE_ENTRA_CLIENT_ID   as string
// Entra External ID (ciamlogin.com) does not use policy/flow names in the authority URL
const authority = `https://${tenantName}.ciamlogin.com/${tenantDomain}/`

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    knownAuthorities: [`${tenantName}.ciamlogin.com`],
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false  // always land on root after redirect, not back to /login
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true  // required for Edge/Safari tracking prevention blocking redirect state
  }
}

export const msalInstance = new PublicClientApplication(msalConfig)

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account'
}

// Token stored directly from handleRedirectPromise or acquireTokenSilent
let _cachedIdToken: string | null = null

export function setCachedToken(token: string | null) {
  _cachedIdToken = token
}

export async function getToken(): Promise<string | null> {
  if (_cachedIdToken) return _cachedIdToken

  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) return null

  try {
    const result: AuthenticationResult = await msalInstance.acquireTokenSilent({
      scopes: loginRequest.scopes,
      account: accounts[0]
    })
    _cachedIdToken = result.idToken
    return _cachedIdToken
  } catch (e) {
    console.error('[getToken] acquireTokenSilent failed:', e)
    return null
  }
}

export async function signIn(): Promise<void> {
  await msalInstance.loginRedirect(loginRequest)
}

export async function signOut(): Promise<void> {
  await msalInstance.logoutRedirect()
}

export function getCurrentUser(): AccountInfo | null {
  const accounts = msalInstance.getAllAccounts()
  return accounts[0] ?? null
}
