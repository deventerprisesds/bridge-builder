import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getBlobClient, generateSasUrl } from '../lib/blobStorage'

const CONTAINER = 'bridge-apks'

app.http('listAppBuilds', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      await verifyToken(req)
      const appId = req.query.get('appId')
      if (!appId) return { status: 400, jsonBody: { error: 'appId required' } }

      const container = getBlobClient().getContainerClient(CONTAINER)
      const prefix    = `${appId}/`
      const builds: {
        name: string
        blobPath: string
        sizeBytes: number
        lastModified: string
        downloadUrl: string
      }[] = []

      for await (const blob of container.listBlobsFlat({ prefix })) {
        // Only include .apk files; skip any stray files
        if (!blob.name.endsWith('.apk')) continue

        builds.push({
          name:         blob.name.replace(prefix, ''),   // e.g. "journey-voice-v1.0.25.apk"
          blobPath:     blob.name,
          sizeBytes:    blob.properties.contentLength ?? 0,
          lastModified: blob.properties.lastModified?.toISOString() ?? '',
          downloadUrl:  generateSasUrl(blob.name),
        })
      }

      // Newest first (blob names contain version numbers but lastModified is more reliable)
      builds.sort((a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      )

      return { status: 200, jsonBody: { builds } }
    } catch (err: any) {
      return {
        status: err.message?.includes('token') || err.message?.includes('Unauthorised') ? 401 : 500,
        jsonBody: { error: err.message }
      }
    }
  }
})
