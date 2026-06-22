import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getTable } from '../lib/tableStorage'
import { generateSasUrl } from '../lib/blobStorage'

app.http('getBuildStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const appId = req.query.get('appId')
      const jobId = req.query.get('jobId')

      const client = getTable('BridgeBuildJobs')
      const jobs: any[] = []

      // For a specific job (jobId), scope to the user's partition.
      // For latest-build polling (no jobId), query by AppId only — push-triggered
      // CI builds land on partition "ci:<appId>", not the user's subjectId partition.
      const filter = jobId
        ? `PartitionKey eq '${subjectId}' and RowKey eq '${jobId}'`
        : `AppId eq '${appId}'`

      for await (const entity of client.listEntities({ queryOptions: { filter } })) {
        jobs.push(entity)
      }

      if (!jobs.length) return { status: 404, jsonBody: { error: 'No builds found' } }

      const latest = jobs.sort((a, b) =>
        new Date(b.StartedAt as string).getTime() - new Date(a.StartedAt as string).getTime()
      )[0]

      let downloadUrl = ''
      if (latest.Status === 'ready' && latest.ApkBlobPath) {
        downloadUrl = generateSasUrl(latest.ApkBlobPath as string)
      }

      return { status: 200, jsonBody: { ...latest, downloadUrl } }
    } catch (err: any) {
      return { status: 401, jsonBody: { error: err.message } }
    }
  }
})
