import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getUserKeys, getTable } from '../lib/tableStorage'
import { getOctokit, parseRepo, upsertFile, fetchFile } from '../lib/githubClient'
import { sanitizeThemeColor } from '../lib/colorUtils'

app.http('triggerBuild', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const { appId, config } = await req.json() as { appId: string; config: Record<string, any> }
      // Sanitize themeColor before it reaches the GitHub commit or Table Storage.
      // This is the last line of defense: even if the client sends a CSS expression
      // (e.g. from stale Table Storage data loaded pre-fix), it cannot reach the APK build.
      config.themeColor = sanitizeThemeColor(config.themeColor)
      const keys = await getUserKeys(subjectId)

      if (!keys.githubToken) {
        return { status: 400, jsonBody: { error: 'GitHub token not configured' } }
      }

      const octokit = getOctokit(keys.githubToken)
      const { owner, repo } = parseRepo(process.env.GITHUB_TEMPLATE_REPO!)

      // Fetch existing config and merge so that manually-added keys (e.g. scheduleWidget,
      // prioritiesWidget, voice) are preserved when a rebuild is triggered from the UI.
      // UI-supplied keys take precedence over existing values.
      // CI-owned metadata keys are stripped from the base so CI continues to own them.
      const path = `configs/${appId}/bridge.config.json`
      let baseConfig: Record<string, any> = {}
      const existingRaw = await fetchFile(octokit, owner, repo, path)
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw)
          const { _buildTriggeredAt: _a, _apkVersion: _b, _apkDownloadUrl: _c, ...rest } = parsed
          baseConfig = rest
        } catch { /* ignore malformed existing file */ }
      }

      // _buildTriggeredAt ensures the file content always changes even when the
      // user config is unchanged — GitHub Actions only fires on real file diffs.
      const fileContent = JSON.stringify(
        { ...baseConfig, ...config, _buildTriggeredAt: new Date().toISOString() },
        null, 2
      )
      await upsertFile(
        octokit, owner, repo, path,
        fileContent,
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
