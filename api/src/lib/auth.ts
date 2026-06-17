import { HttpRequest } from '@azure/functions'
import * as jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const entraTenantName = (process.env.ENTRA_EXTERNAL_TENANT_NAME ?? process.env.ENTRA_TENANT_NAME)!
const entraTenantId   = process.env.ENTRA_EXTERNAL_TENANT_ID!
const allowedEmail    = process.env.ALLOWED_USER_EMAIL!

// Tokens issued via Google OAuth through CIAM use tenant ID in both JWKS and issuer URLs
const client = jwksClient({
  jwksUri: `https://${entraTenantId}.ciamlogin.com/${entraTenantId}/discovery/v2.0/keys`,
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

  const unverified = jwt.decode(token) as any
  const actualIss = unverified?.iss ?? 'unknown'

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        // Entra External ID issuer for CIAM tenants
        issuer: `https://${entraTenantId}.ciamlogin.com/${entraTenantId}/v2.0`
      },
      (err, decoded: any) => {
        if (err) {
          return reject(new Error(`Invalid token: ${err.message} | actual iss="${actualIss}" | expected iss="https://${entraTenantId}.ciamlogin.com/${entraTenantId}/v2.0"`))
        }

        const email = decoded.email ?? decoded.preferred_username ?? decoded.emails?.[0] ?? ''
        if (email.toLowerCase() !== allowedEmail.toLowerCase()) {
          return reject(new Error(`Unauthorised: token email="${email}" does not match allowed="${allowedEmail}"`))
        }
        resolve(decoded.sub as string)
      }
    )
  })
}
