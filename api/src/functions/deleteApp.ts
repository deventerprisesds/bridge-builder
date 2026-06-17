import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getTable } from '../lib/tableStorage'

app.http('deleteApp', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const appId = req.query.get('appId')
      if (!appId) return { status: 400, jsonBody: { error: 'Missing appId' } }

      await getTable('BridgeApps').deleteEntity(subjectId, appId)

      return { status: 200, jsonBody: { deleted: true } }
    } catch (err: any) {
      return { status: 400, jsonBody: { error: err.message } }
    }
  }
})
