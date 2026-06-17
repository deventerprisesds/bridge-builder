import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp, useSaveApp, useDeleteApp } from '../hooks/useApps'
import { useBuildStatus } from '../hooks/useBuildStatus'
import { triggerBuild, BridgeConfig } from '../lib/apiClient'
import { ConfigEditor } from '../components/ConfigEditor'
import { BuildStatusBadge } from '../components/BuildStatusBadge'
import { ApkDownloadButton } from '../components/ApkDownloadButton'

export default function AppDetail() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const app = useApp(appId)
  const { data: build, isLoading: buildLoading } = useBuildStatus(appId)
  const { mutateAsync: saveApp } = useSaveApp()
  const { mutateAsync: deleteApp } = useDeleteApp()

  const [editing, setEditing]     = useState(false)
  const [building, setBuilding]   = useState(false)
  const [error, setError]         = useState('')

  const [config, setConfig] = useState<BridgeConfig | null>(null)

  function getConfig(): BridgeConfig | null {
    if (!app) return null
    try {
      return JSON.parse(app.ConfigJson) as BridgeConfig
    } catch {
      return { appName: app.AppName, baseUrl: app.BaseUrl, themeColor: app.ThemeColor || '#1e40af', deepLinks: {}, channels: [] }
    }
  }

  const displayConfig = config ?? getConfig()

  async function handleSave() {
    if (!app || !displayConfig) return
    await saveApp({
      appId:      app.rowKey,
      appName:    displayConfig.appName,
      baseUrl:    displayConfig.baseUrl,
      iconUrl:    displayConfig.iconUrl,
      themeColor: displayConfig.themeColor,
      configJson: JSON.stringify(displayConfig)
    })
    setEditing(false)
    setConfig(null)
  }

  async function handleRebuild() {
    if (!app || !displayConfig) return
    setBuilding(true)
    setError('')
    try {
      await triggerBuild(app.rowKey, displayConfig)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBuilding(false)
    }
  }

  async function handleDelete() {
    if (!app) return
    if (!confirm(`Delete ${app.AppName}? This cannot be undone.`)) return
    await deleteApp(app.rowKey)
    navigate('/')
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            {app.IconUrl ? (
              <img src={app.IconUrl} alt={app.AppName}
                className="w-8 h-8 rounded-lg object-contain border border-gray-100" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: app.ThemeColor || '#1e40af' }}>
                {app.AppName[0]}
              </div>
            )}
            <h1 className="font-semibold text-gray-900 truncate">{app.AppName}</h1>
          </div>

          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 text-sm"
          >Delete</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Build Status Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900">Build status</h2>
            <Link to={`/app/${appId}/history`} className="text-sm text-blue-600 hover:text-blue-800">
              History →
            </Link>
          </div>

          {buildLoading && (
            <div className="animate-pulse h-8 bg-gray-100 rounded w-32" />
          )}

          {!buildLoading && !build && (
            <p className="text-gray-500 text-sm">No builds yet.</p>
          )}

          {build && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <BuildStatusBadge status={build.Status} />
                {build.ApkVersion && (
                  <span className="text-sm text-gray-500">v{build.ApkVersion}</span>
                )}
                {build.StartedAt && (
                  <span className="text-xs text-gray-400">
                    Started {new Date(build.StartedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {build.ErrorMessage && (
                <p className="text-sm text-red-600 bg-red-50 rounded p-2">{build.ErrorMessage}</p>
              )}

              <ApkDownloadButton job={build} />
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleRebuild}
              disabled={building || build?.Status === 'building' || build?.Status === 'pending'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                         text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {building ? 'Triggering…' : '↺ Rebuild'}
            </button>
          </div>
        </div>

        {/* Config Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900">Configuration</h2>
            {!editing && (
              <button
                onClick={() => { setConfig(getConfig()); setEditing(true) }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >Edit</button>
            )}
          </div>

          {editing && displayConfig ? (
            <div className="space-y-4">
              <ConfigEditor
                config={displayConfig}
                onChange={setConfig}
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setEditing(false); setConfig(null) }}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                >Cancel</button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
                >Save</button>
              </div>
            </div>
          ) : displayConfig ? (
            <pre className="bg-gray-50 text-xs rounded-lg p-4 overflow-auto max-h-64 text-gray-700">
              {JSON.stringify(displayConfig, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">No configuration saved yet.</p>
          )}
        </div>

        {/* App info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-medium text-gray-900 mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 flex-shrink-0">App ID</dt>
              <dd className="text-gray-900 font-mono text-xs">{app.rowKey}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 flex-shrink-0">Base URL</dt>
              <dd className="text-gray-900"><a href={app.BaseUrl} target="_blank" rel="noreferrer"
                className="text-blue-600 hover:underline">{app.BaseUrl}</a></dd>
            </div>
            {app.GithubRepoUrl && (
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 flex-shrink-0">GitHub</dt>
                <dd><a href={app.GithubRepoUrl} target="_blank" rel="noreferrer"
                  className="text-blue-600 hover:underline text-xs">{app.GithubRepoUrl}</a></dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 flex-shrink-0">Created</dt>
              <dd className="text-gray-900">{new Date(app.CreatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  )
}
