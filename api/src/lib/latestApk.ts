// WHAT:       Pure helpers behind getLatestApk: check the shared server token, read app ids, and pick the
//             newest .apk for an app out of a blob listing.
// WHY:        TaskOS and Huddle show a "Download" tab in Settings with the newest phone build. The links
//             written into bridge.config.json carry a 30-day signed URL that goes stale, and the APK
//             container is private (an unsigned URL returns HTTP 409, measured 2026-11-10), so the
//             apps ask this API for a freshly signed link each time instead.
// SUPERSEDES: nothing. SUPERSEDED-BY: nothing -- current.
// EVIDENCE:   journey-voice/bridge-builder branch claude_secret-probe runs 42807531417 / 42807535269.
import { createHash, timingSafeEqual } from 'crypto'

export interface ApkBlob {
  name: string
  lastModified?: Date
  contentLength?: number
}

export interface LatestApk {
  fileName: string
  blobPath: string
  version: string | null
  builtAt: string
  sizeBytes: number
}

const APP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const MAX_APP_IDS = 5

/** True only when a non-empty token was configured AND the caller sent exactly it. */
export function tokenMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/** "a,b" -> [a, b]. Returns null when any id is not a uuid, when there are none, or too many. */
export function parseAppIds(raw: string | null | undefined): string[] | null {
  const ids = [...new Set(String(raw ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))]
  if (ids.length === 0 || ids.length > MAX_APP_IDS) return null
  return ids.every(id => APP_ID.test(id)) ? ids : null
}

/** "taskos-v1.0.18.apk" -> "1.0.18". */
export function parseApkVersion(fileName: string): string | null {
  return fileName.match(/-v(\d+(?:\.\d+)*)\.apk$/i)?.[1] ?? null
}

/** Newest .apk directly under `<appId>/`, by upload time. */
export function pickLatestApk(blobs: ApkBlob[], appId: string): LatestApk | null {
  const prefix = `${appId}/`
  let best: ApkBlob | null = null
  for (const b of blobs) {
    if (!b.name.startsWith(prefix) || !b.name.toLowerCase().endsWith('.apk')) continue
    if (b.name.slice(prefix.length).includes('/')) continue
    const t = b.lastModified?.getTime() ?? 0
    if (!best || t > (best.lastModified?.getTime() ?? 0)) best = b
  }
  if (!best) return null
  const fileName = best.name.slice(prefix.length)
  return {
    fileName,
    blobPath: best.name,
    version: parseApkVersion(fileName),
    builtAt: best.lastModified?.toISOString() ?? '',
    sizeBytes: best.contentLength ?? 0,
  }
}
