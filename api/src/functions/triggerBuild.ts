import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getUserKeys, getTable } from '../lib/tableStorage'
import { getOctokit, parseRepo, upsertFile } from '../lib/githubClient'

app.http('triggerBuild', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const { appId, config } = await req.json() as { appId: string; config: Record<string, any> }
      const keys = await getUserKeys(subjectId)

      if (!keys.githubToken) {
        return { status: 400, jsonBody: { error: 'GitHub token not configured' } }
      }

      const octokit = getOctokit(keys.githubToken)
      const { owner, repo } = parseRepo(process.env.GITHUB_TEMPLATE_REPO!)

      // Commit bridge.config.json to the template repo to trigger CI
      const path = `configs/${appId}/bridge.config.json`
      await upsertFile(
        octokit, owner, repo, path,
        JSON.stringify(config, null, 2),
        `Build: ${config.appName} [${new Date().toISOString()}]`
      )

      const jobId = crypto.randomUUID()
      const version = `1.0.${Date.now()}`

      await getTable('BridgeBuildJobs').createEntity({
        partitionKey: subjectId,
        rowKey: jobId,
        AppId: appId,
        Status: 'pending',
        ApkVersion: version,
        StartedAt: new Date().toISOString()
      })

      // Also update the app's config in BridgeApps
      try {
        const appsTable = getTable('BridgeApps')
        const existing = await appsTable.getEntity(subjectId, appId)
        await appsTable.updateEntity({
          partitionKey: subjectId,
          rowKey: appId,
          ...existing,
          ConfigJson: JSON.stringify(config),
          ConfigCommittedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        }, 'Replace')
      } catch { /* App may not exist yet; ignore */ }

      return { status: 200, jsonBody: { jobId, version } }
    } catch (err: any) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})
