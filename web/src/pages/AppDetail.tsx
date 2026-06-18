import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useApp, useSaveApp, useDeleteApp } from '../hooks/useApps'
import { useBuildStatus } from '../hooks/useBuildStatus'
import { triggerBuild, scanWebapp, BridgeConfig, ScanResult } from '../lib/apiClient'
import { ConfigEditor, scanResultToConfig } from '../components/ConfigEditor'
import { CapabilityReport } from '../components/CapabilityReport'
import { BuildStatusBadge } from '../components/BuildStatusBadge'
import { ApkDownloadButton } from '../components/ApkDownloadButton'
import { ScanProgress } from '../components/ScanProgress'

export default function AppDetail() {
  const { appId } = useParams<{ appId: string }>()
  const navigate  = useNavigate()
  const app       = useApp(appId)
  const queryClient = useQueryClient()
  const { data: build, isLoading: buildLoading } = useBuildStatus(appId)
  const { mutateAsync: saveApp }   = useSaveApp()
  const { mutateAsync: deleteApp } = useDeleteApp()

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (build?.Status !== 'building' && build?.Status !== 'pending') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [build?.Status])

  // ── Normal edit/rebuild state ─────────────────────────────────────────────
  const [editing, setEditing]   = useState(false)
  const [building, setBuilding] = useState(false)
  const [error, setError]       = useState('')
  const [config, setConfig]     = useState<BridgeConfig | null>(null)

  // ── Rescan state ──────────────────────────────────────────────────────────
  /**
   * Design rule: rescan ALWAYS stops at review.
   * Scan → CapabilityReport → editable ConfigEditor → explicit confirm → build.
   * There is no "scan and rebuild immediately" shortcut.
   */
  const [rescanning, setRescanning]         = useState(false)
  const [rescanResult, setRescanResult]     = useState<ScanResult | null>(null)
  const [rescanConfig, setRescanConfig]     = useState<BridgeConfig | null>(null)
  const [confirmBuilding, setConfirmBuilding] = useState(false)

  function parsedConfig(): BridgeConfig | null {
    if (!app) return null
    try { return JSON.parse(app.ConfigJson) as BridgeConfig }
    catch { return {
      appName:   app.AppName,
      baseUrl:   app.BaseUrl,
      themeColor: app.ThemeColor || '#1b4f5c',
      deepLinks: {},
      notifications: { channels: [] },
      widget: { enabled: false, name: '', dataUrl: '', refreshMinutes: 15, tapDeepLink: '/' },
    }}
  }

  const displayConfig = config ?? parsedConfig()

  async function handleSave() {
    if (!app || !displayConfig) return
    await saveApp({
      appId: app.rowKey,
      appName:    displayConfig.appName,
      baseUrl:    displayConfig.baseUrl,
      iconUrl:    displayConfig.iconUrl,
      themeColor: displayConfig.themeColor,
      configJson: JSON.stringify(displayConfig),
    })
    setEditing(false); setConfig(null)
  }

  async function handleRebuild() {
    if (!app || !displayConfig) return
    setBuilding(true); setError('')
    try {
      await triggerBuild(app.rowKey, displayConfig)
      // Invalidate the cached build status so React Query discards any stale
      // 'ready'/'failed' snapshot and immediately starts polling the new build.
      // Without this, refetchInterval stays false (it stopped polling when the
      // previous build reached a terminal state) and the UI shows stale data.
      queryClient.invalidateQueries({ queryKey: ['buildStatus', appId] })
    }
    catch (err: any) { setError(err.message) }
    finally { setBuilding(false) }
  }

  async function handleRescan() {
    if (!app) return
    setError('')
    setRescanResult(null)
    setRescanConfig(null)
    setRescanning(true)
    // Exit manual edit mode if open
    setEditing(false); setConfig(null)
    try {
      const result = await scanWebapp(
        app.BaseUrl,
        app.GithubRepoUrl || undefined
      )
      setRescanResult(result)
      setRescanConfig(scanResultToConfig(result, app.BaseUrl))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRescanning(false)
    }
  }

  function cancelRescan() {
    setRescanResult(null)
    setRescanConfig(null)
    setError('')
  }

  /** Save the rescanned config and trigger a build. Always requires explicit confirm. */
  async function handleRescanConfirmBuild() {
    if (!app || !rescanConfig) return
    setConfirmBuilding(true); setError('')
    try {
      await saveApp({
        appId:      app.rowKey,
        appName:    rescanConfig.appName,
        baseUrl:    rescanConfig.baseUrl,
        iconUrl:    rescanConfig.iconUrl,
        themeColor: rescanConfig.themeColor,
        configJson: JSON.stringify(rescanConfig),
      })
      await triggerBuild(app.rowKey, rescanConfig)
      // Invalidate cached build status so UI starts polling the new build immediately.
      queryClient.invalidateQueries({ queryKey: ['buildStatus', appId] })
      // Clear rescan state — build status card will update via polling
      setRescanResult(null)
      setRescanConfig(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConfirmBuilding(false)
    }
  }

  async function handleDelete() {
    if (!app || !confirm(`Delete ${app.AppName}? This cannot be undone.`)) return
    await deleteApp(app.rowKey)
    navigate('/')
  }

  if (!app) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="skeleton w-32 h-8 rounded" />
    </div>
  )

  const isRescanning = rescanning || !!rescanResult

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="bg-neutral-0 border-b border-neutral-200 sticky top-0 z-20 shadow-elevation-0">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to="/" className="w-8 h-8 rounded-md flex items-center justify-center
                                  text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700
                                  transition-colors duration-150 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            {app.IconUrl ? (
              <img src={app.IconUrl} alt={app.AppName}
                className="w-7 h-7 rounded-md object-contain border border-neutral-100 flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-white
                              text-caption-md font-bold flex-shrink-0"
                style={{ backgroundColor: app.ThemeColor || '#1b4f5c' }}>
                {app.AppName[0]?.toUpperCase()}
              </div>
            )}
            <h1 className="text-label-lg font-semibold text-neutral-900 truncate">{app.AppName}</h1>
          </div>

          <button onClick={handleDelete}
            className="btn-ghost py-1.5 px-3 text-body-sm text-error hover:bg-error-subtle hover:text-error">
            Delete
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Error */}
        {error && (
          <div className="alert-error">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-body-sm font-medium">{error}</span>
          </div>
        )}

        {/* ── Scanning in progress ─────────────────────────────────────── */}
        {rescanning && (
          <section className="card rounded-lg p-8 text-center space-y-6">
            <div>
              <h2 className="text-h4 font-bold text-neutral-900 mb-1">Re-scanning webapp</h2>
              <p className="text-body-sm text-neutral-500">{app.BaseUrl}</p>
            </div>
            <ScanProgress scanning={rescanning} />
            <p className="text-caption-md text-neutral-400">
              This may take up to 30 seconds if using GPT-4o analysis.
            </p>
          </section>
        )}

        {/* ── Rescan review: CapabilityReport + ConfigEditor ───────────── */}
        {!rescanning && rescanResult && rescanConfig && (
          <section className="card rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-h4 font-bold text-neutral-900 mb-1">Review re-scan results</h2>
              <p className="text-caption-md text-neutral-500">
                Review the capability report and config below. Edit any fields, then confirm to save
                and rebuild. Cancelling discards the scan and keeps the existing config.
              </p>
            </div>

            {/* Confidence legend */}
            <div className="flex items-center gap-4 text-caption-md text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                Found in source
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
                Inferred by AI
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300" />
                Default value
              </span>
            </div>

            {/* Compass theme colour offer */}
            {rescanResult.compassThemeColor && (
              <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                <span className="w-5 h-5 rounded flex-shrink-0 border border-neutral-200"
                  style={{ backgroundColor: rescanResult.compassThemeColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-label-sm font-medium text-neutral-700">Compass design system colour available</p>
                  <p className="text-caption-md text-neutral-400">{rescanResult.compassThemeColor}</p>
                </div>
                <button type="button"
                  onClick={() => setRescanConfig(c => c ? { ...c, themeColor: rescanResult.compassThemeColor! } : c)}
                  className="btn-secondary py-1 px-3 text-body-sm flex-shrink-0">
                  Apply
                </button>
              </div>
            )}

            {/* Capability report */}
            {rescanResult.capabilityReport && rescanResult.capabilityReport.length > 0 && (
              <div>
                <h3 className="text-label-md font-semibold text-neutral-800 mb-2">
                  Android capability scan
                </h3>
                <CapabilityReport report={rescanResult.capabilityReport} />
              </div>
            )}

            {/* Editable config */}
            <ConfigEditor
              config={rescanConfig}
              confidence={rescanResult.confidence}
              onChange={setRescanConfig}
            />

            {/* Action buttons — explicit confirm required, no auto-build */}
            <div className="flex gap-3 pt-2 border-t border-neutral-100">
              <button
                onClick={cancelRescan}
                className="btn-secondary flex-1 justify-center py-2.5"
              >
                ← Cancel rescan
              </button>
              <button
                onClick={handleRescanConfirmBuild}
                disabled={confirmBuilding}
                className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-40"
              >
                {confirmBuilding ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving &amp; triggering build…
                  </>
                ) : (
                  <>
                    Confirm &amp; Build APK
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* ── Normal view (hidden while rescanning or reviewing) ────────── */}
        {!isRescanning && (
          <>
            {/* Build status card */}
            <section className="card rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-label-lg font-semibold text-neutral-900">Build status</h2>
                <Link to={`/app/${appId}/history`}
                  className="text-body-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  History →
                </Link>
              </div>

              {buildLoading && (
                <div className="flex items-center gap-3">
                  <div className="skeleton w-16 h-5 rounded-full" />
                  <div className="skeleton w-24 h-3.5 rounded" />
                </div>
              )}

              {!buildLoading && !build && (
                <p className="text-body-sm text-neutral-400">No builds yet.</p>
              )}

              {build && (
                <div className="space-y-3">
                  <div className="flex items-center flex-wrap gap-3">
                    <BuildStatusBadge status={build.Status} />
                    {build.ApkVersion && (
                      <span className="text-body-sm text-neutral-600 font-medium">
                        v{build.ApkVersion}
                      </span>
                    )}
                    {build.StartedAt && (build.Status === 'building' || build.Status === 'pending') && (() => {
                      const elapsed = Math.floor((now - new Date(build.StartedAt).getTime()) / 1000)
                      const m = Math.floor(elapsed / 60), s = elapsed % 60
                      return (
                        <span className="text-caption-md text-neutral-500 tabular-nums">
                          {m > 0 ? `${m}m ` : ''}{s}s elapsed
                        </span>
                      )
                    })()}
                    {build.StartedAt && build.Status !== 'building' && build.Status !== 'pending' && (
                      <span className="text-caption-md text-neutral-400">
                        Started {new Date(build.StartedAt).toLocaleString()}
                      </span>
                    )}
                    {build.GithubRunId && (
                      <a
                        href={`https://github.com/deventerprisesds/android-bridge-template/actions/runs/${build.GithubRunId}`}
                        target="_blank" rel="noreferrer"
                        className="text-caption-md text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        View live log →
                      </a>
                    )}
                  </div>

                  {build.ErrorMessage && (
                    <div className="alert-error text-body-sm">
                      {build.ErrorMessage}
                    </div>
                  )}

                  <ApkDownloadButton job={build} />
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
                <button
                  onClick={handleRebuild}
                  disabled={building || build?.Status === 'building' || build?.Status === 'pending'}
                  className="btn-secondary py-1.5 px-3 text-body-sm gap-1.5 disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {building ? 'Triggering…' : 'Rebuild'}
                </button>

                <button
                  onClick={handleRescan}
                  disabled={rescanning || build?.Status === 'building' || build?.Status === 'pending'}
                  className="btn-secondary py-1.5 px-3 text-body-sm gap-1.5 disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  Re-scan &amp; configure
                </button>
              </div>
            </section>

            {/* Config card */}
            <section className="card rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-label-lg font-semibold text-neutral-900">Configuration</h2>
                {!editing && (
                  <button
                    onClick={() => { setConfig(parsedConfig()); setEditing(true) }}
                    className="text-body-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing && displayConfig ? (
                <div className="space-y-4">
                  <ConfigEditor config={displayConfig} onChange={setConfig} />
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setEditing(false); setConfig(null) }}
                      className="btn-secondary flex-1 justify-center py-2">
                      Cancel
                    </button>
                    <button onClick={handleSave} className="btn-primary flex-1 justify-center py-2">
                      Save changes
                    </button>
                  </div>
                </div>
              ) : displayConfig ? (
                <pre className="bg-neutral-50 text-caption-md rounded-lg p-4 overflow-auto
                                max-h-64 text-neutral-700 leading-relaxed border border-neutral-200">
                  {JSON.stringify(displayConfig, null, 2)}
                </pre>
              ) : (
                <p className="text-body-sm text-neutral-400">No configuration saved yet.</p>
              )}
            </section>

            {/* Details card */}
            <section className="card rounded-lg p-5">
              <h2 className="text-label-lg font-semibold text-neutral-900 mb-4">Details</h2>
              <dl className="space-y-2.5 text-body-sm">
                {[
                  ['App ID',   <span className="font-mono text-caption-md">{app.rowKey}</span>],
                  ['Base URL', <a href={app.BaseUrl} target="_blank" rel="noreferrer"
                                  className="text-brand-600 hover:underline">{app.BaseUrl}</a>],
                  app.GithubRepoUrl && ['GitHub', <a href={app.GithubRepoUrl} target="_blank" rel="noreferrer"
                                  className="text-brand-600 hover:underline text-caption-md">{app.GithubRepoUrl}</a>],
                  ['Created',  new Date(app.CreatedAt).toLocaleString()],
                ].filter(Boolean).map(([key, val], i) => (
                  <div key={i} className="flex gap-2">
                    <dt className="text-neutral-400 w-24 flex-shrink-0 pt-px">{key}</dt>
                    <dd className="text-neutral-900 min-w-0">{val as React.ReactNode}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}

      </main>
    </div>
  )
}
