import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getTable } from '../lib/tableStorage'
import { encrypt } from '../lib/crypto'

app.http('storeApiKeys', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const { openAiKey, githubToken, figmaToken } = await req.json() as {
        openAiKey?: string
        githubToken?: string
        figmaToken?: string
      }

      const entity: Record<string, string> = {
        partitionKey: 'keys',
        rowKey: subjectId,
        UpdatedAt: new Date().toISOString()
      }

      if (openAiKey)   entity.OpenAiKeyEncrypted   = encrypt(openAiKey)
      if (githubToken) entity.GithubTokenEncrypted = encrypt(githubToken)
      if (figmaToken)  entity.FigmaTokenEncrypted  = encrypt(figmaToken)

      await getTable('BridgeUserKeys').upsertEntity(entity, 'Merge')

      return { status: 200, jsonBody: { stored: true } }
    } catch (err: any) {
      return { status: 401, jsonBody: { error: err.message } }
    }
  }
})
