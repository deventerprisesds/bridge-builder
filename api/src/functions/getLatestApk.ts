// WHAT:       GET /api/getLatestApk?appId=<id>[,<id>] -> the newest APK per app, with a fresh 30-day link.
// WHY:        Read by the TaskOS (journey) and Huddle servers for their Settings "Download" tab. Server to
//             server only: auth is the shared JOURNEY_PROXY_TOKEN in `x-journey-proxy-token` (the same
//             token those two apps already share; no new secret). Read-only.
// SUPERSEDES: nothing. SUPERSEDED-BY: nothing -- current.
// EVIDENCE:   see ../lib/latestApk.ts.
import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { getBlobClient, generateSasUrl } from '../lib/blobStorage'
import { parseAppIds, pickLatestApk, tokenMatches, ApkBlob } from '../lib/latestApk'

const CONTAINER = 'bridge-apks'

app.http('getLatestApk', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const expected = process.env.JOURNEY_PROXY_TOKEN
    if (!expected) return { status: 503, jsonBody: { error: 'not_configured' } }
    if (!tokenMatches(req.headers.get('x-journey-proxy-token'), expected)) {
      return { status: 401, jsonBody: { error: 'Unauthorised' } }
    }
    const appIds = parseAppIds(req.query.get('appId'))
    if (!appIds) return { status: 400, jsonBody: { error: 'appId must be 1-5 comma-separated uuids' } }

    try {
      const container = getBlobClient().getContainerClient(CONTAINER)
      const apps = []
      for (const appId of appIds) {
        const blobs: ApkBlob[] = []
        for await (const b of container.listBlobsFlat({ prefix: `${appId}/` })) {
          blobs.push({ name: b.name, lastModified: b.properties.lastModified, contentLength: b.properties.contentLength })
        }
        const latest = pickLatestApk(blobs, appId)
        apps.push(latest
          ? { appId, found: true, ...latest, downloadUrl: generateSasUrl(latest.blobPath) }
          : { appId, found: false })
      }
      return { status: 200, jsonBody: { apps } }
    } catch (err: any) {
      return { status: 500, jsonBody: { error: err?.message ?? 'list_failed' } }
    }
  }
})
