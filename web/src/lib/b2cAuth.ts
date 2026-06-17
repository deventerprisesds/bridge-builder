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
const userFlow     = 'SignInSignUp'

// Entra External ID authority URL pattern: ciamlogin.com
const authority = `https://${tenantName}.ciamlogin.com/${tenantDomain}/${userFlow}`

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    knownAuthorities: [`${tenantName}.ciamlogin.com`],
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  }
}

export const msalInstance = new PublicClientApplication(msalConfig)

export const loginRequest = {
  scopes: ['openid', 'profile', 'email']
}

export async function getToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) return null
  try {
    const result: AuthenticationResult = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0]
    })
    return result.idToken
  } catch {
    return null
  }
}

export async function signIn(): Promise<void> {
  await msalInstance.loginPopup(loginRequest)
}

export async function signOut(): Promise<void> {
  await msalInstance.logoutPopup()
}

export function getCurrentUser(): AccountInfo | null {
  const accounts = msalInstance.getAllAccounts()
  return accounts[0] ?? null
}
