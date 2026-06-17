import { HttpRequest } from '@azure/functions'
import * as jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

// Env var is ENTRA_EXTERNAL_TENANT_NAME on the live function app
const entraTenantName = (process.env.ENTRA_EXTERNAL_TENANT_NAME ?? process.env.ENTRA_TENANT_NAME)!
const allowedEmail    = process.env.ALLOWED_USER_EMAIL!

// Entra External ID (CIAM) JWKS endpoint
const client = jwksClient({
  jwksUri: `https://${entraTenantName}.ciamlogin.com/${entraTenantName}.onmicrosoft.com/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true
})

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(err, key?.getPublicKey())
  })
}

export async function verifyToken(req: HttpRequest): Promise<string> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) throw new Error('No token')

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        // Entra External ID issuer for CIAM tenants
        issuer: `https://${entraTenantName}.ciamlogin.com/${entraTenantName}.onmicrosoft.com/v2.0/`
      },
      (err, decoded: any) => {
        if (err) {
          console.error('[auth] JWT verify failed:', err.message, '| issuer expected:', `https://${entraTenantName}.ciamlogin.com/${entraTenantName}.onmicrosoft.com/v2.0/`)
          return reject(new Error('Invalid token'))
        }

        // Entra External ID puts email in 'email' claim (not 'emails' array like B2C)
        const email = decoded.email ?? decoded.preferred_username ?? decoded.emails?.[0] ?? ''
        console.log('[auth] token email:', email, '| allowed:', allowedEmail, '| iss:', decoded.iss)
        if (email.toLowerCase() !== allowedEmail.toLowerCase()) {
          return reject(new Error('Unauthorised user'))
        }
        resolve(decoded.sub as string)
      }
    )
  })
}
