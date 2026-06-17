import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

// TEMPORARY DEBUG ENDPOINT — remove after auth is confirmed working
app.http('debugToken', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return { status: 400, jsonBody: { error: 'No Authorization header' } }
    }

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return { status: 400, jsonBody: { error: 'Not a JWT' } }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))

      return {
        status: 200,
        jsonBody: {
          iss: payload.iss,
          email: payload.email ?? null,
          preferred_username: payload.preferred_username ?? null,
          emails: payload.emails ?? null,
          name: payload.name ?? null,
          oid: payload.oid ?? null,
          allowed_user_email_env: process.env.ALLOWED_USER_EMAIL,
          entra_tenant_name_env: process.env.ENTRA_EXTERNAL_TENANT_NAME ?? process.env.ENTRA_TENANT_NAME
        }
      }
    } catch (e: any) {
      return { status: 500, jsonBody: { error: e.message } }
    }
  }
})
