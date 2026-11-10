import test from 'node:test'
import assert from 'node:assert/strict'
import { tokenMatches, parseAppIds, parseApkVersion, pickLatestApk } from '../src/lib/latestApk.ts'

const ID = '54beaa01-7564-417f-a6cc-bd9190c14dcb'

test('token: only the exact configured token passes', () => {
  assert.equal(tokenMatches('s3cret', 's3cret'), true)
  assert.equal(tokenMatches('s3cret ', 's3cret'), false)
  assert.equal(tokenMatches('', 's3cret'), false)
  assert.equal(tokenMatches(null, 's3cret'), false)
  assert.equal(tokenMatches('anything', undefined), false)
  assert.equal(tokenMatches('', ''), false)
})

test('appIds: uuids only, 1-5, de-duplicated', () => {
  assert.deepEqual(parseAppIds(`${ID}, ${ID.toUpperCase()}`), [ID])
  assert.equal(parseAppIds(''), null)
  assert.equal(parseAppIds('../etc'), null)
  assert.equal(parseAppIds(`${ID},nope`), null)
  assert.equal(parseAppIds(Array.from({ length: 6 }, (_, i) => ID.slice(0, -1) + i).join(',')), null)
})

test('version is read from the file name', () => {
  assert.equal(parseApkVersion('taskos-v1.0.18.apk'), '1.0.18')
  assert.equal(parseApkVersion('huddle--chat-huddle-and-run-a-team-of-ai-agents-v1.0.17.apk'), '1.0.17')
  assert.equal(parseApkVersion('app.apk'), null)
})

test('latest = newest .apk directly under the app folder', () => {
  const d = (s: string) => new Date(s)
  const got = pickLatestApk([
    { name: `${ID}/taskos-v1.0.17.apk`, lastModified: d('2026-11-01T00:00:00Z'), contentLength: 1 },
    { name: `${ID}/taskos-v1.0.18.apk`, lastModified: d('2026-11-08T00:00:00Z'), contentLength: 2 },
    { name: `${ID}/notes.txt`, lastModified: d('2026-11-09T00:00:00Z') },
    { name: `${ID}/old/taskos-v9.apk`, lastModified: d('2026-11-09T00:00:00Z') },
    { name: `other/x-v2.apk`, lastModified: d('2026-11-10T00:00:00Z') },
  ], ID)
  assert.equal(got?.fileName, 'taskos-v1.0.18.apk')
  assert.equal(got?.version, '1.0.18')
  assert.equal(got?.sizeBytes, 2)
  assert.equal(pickLatestApk([], ID), null)
})
