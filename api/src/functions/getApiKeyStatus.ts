import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getTable } from '../lib/tableStorage'

app.http('getApiKeyStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const client = getTable('BridgeUserKeys')
      let entity: any = null
      try { entity = await client.getEntity('keys', subjectId) } catch { /* not found */ }
      return {
        status: 200,
        jsonBody: {
          hasOpenAiKey:   !!entity?.OpenAiKeyEncrypted,
          hasGithubToken: !!entity?.GithubTokenEncrypted,
          hasFigmaToken:  !!entity?.FigmaTokenEncrypted,
        }
      }
    } catch (err: any) {
      return { status: 401, jsonBody: { error: err.message } }
    }
  }
})
