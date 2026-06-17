import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { listEntitiesForUser } from '../lib/tableStorage'

app.http('getApps', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const apps = await listEntitiesForUser<any>('BridgeApps', subjectId)

      // Sort by UpdatedAt descending
      apps.sort((a, b) =>
        new Date(b.UpdatedAt ?? b.CreatedAt ?? 0).getTime() -
        new Date(a.UpdatedAt ?? a.CreatedAt ?? 0).getTime()
      )

      return { status: 200, jsonBody: apps }
    } catch (err: any) {
      return { status: 401, jsonBody: { error: err.message } }
    }
  }
})
