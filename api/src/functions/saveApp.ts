import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getTable } from '../lib/tableStorage'
import { sanitizeThemeColor, sanitizeConfigJson } from '../lib/colorUtils'

app.http('saveApp', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const body = await req.json() as {
        appId?: string
        appName: string
        baseUrl: string
        githubRepoUrl?: string
        iconUrl?: string
        themeColor?: string
        configJson?: string
      }

      const appId = body.appId ?? crypto.randomUUID()
      const now   = new Date().toISOString()
      const table = getTable('BridgeApps')

      let createdAt = now
      try {
        const existing = await table.getEntity(subjectId, appId)
        createdAt = (existing.CreatedAt as string) ?? now
      } catch { /* New app */ }

      await table.upsertEntity(
        {
          partitionKey: subjectId,
          rowKey: appId,
          AppName:       body.appName,
          BaseUrl:       body.baseUrl,
          GithubRepoUrl: body.githubRepoUrl ?? '',
          IconUrl:       body.iconUrl ?? '',
          ThemeColor:    sanitizeThemeColor(body.themeColor),
          ConfigJson:    sanitizeConfigJson(body.configJson),
          CreatedAt:     createdAt,
          UpdatedAt:     now
        },
        'Replace'
      )

      return { status: 200, jsonBody: { appId } }
    } catch (err: any) {
      return { status: 400, jsonBody: { error: err.message } }
    }
  }
})
