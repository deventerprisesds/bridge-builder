// Called by GitHub Actions CI — NOT by the browser.
// Auth: X-CI-Secret header (AZURE_KEY_ENCRYPTION_SECRET value), NOT a B2C/Entra JWT.
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTable } from '../lib/tableStorage'

app.http('updateBuildStatus', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const ciSecret = req.headers.get('x-ci-secret')
    if (ciSecret !== process.env.AZURE_KEY_ENCRYPTION_SECRET) {
      return { status: 401, jsonBody: { error: 'Unauthorised' } }
    }

    const {
      appId,
      subjectId,
      status,
      githubRunId,
      apkBlobPath,
      apkVersion,
      errorMessage,
      completedAt
    } = await req.json() as any

    const client = getTable('BridgeBuildJobs')
    const jobs: any[] = []

    // Transitioning to 'building': job has no runId yet — find the pending job by appId.
    // Transitioning to 'ready'/'failed': runId was set by the building step, use it.
    const filter = (status === 'building' || !githubRunId)
      ? `AppId eq '${appId}' and Status eq 'pending'`
      : `AppId eq '${appId}' and GithubRunId eq '${githubRunId}'`

    for await (const entity of client.listEntities({ queryOptions: { filter } })) {
      jobs.push(entity)
    }

    const job = jobs[0]
    if (!job) return { status: 404, jsonBody: { error: 'Job not found' } }

    await client.updateEntity(
      {
        partitionKey: job.partitionKey as string,
        rowKey: job.rowKey as string,
        Status: status,
        ...(githubRunId  && { GithubRunId:   githubRunId }),
        ...(apkBlobPath  && { ApkBlobPath:   apkBlobPath }),
        ...(apkVersion   && { ApkVersion:    apkVersion }),
        ...(errorMessage && { ErrorMessage:  errorMessage }),
        ...(completedAt  && { CompletedAt:   completedAt })
      },
      'Merge'
    )

    return { status: 200, jsonBody: { updated: true } }
  }
})
