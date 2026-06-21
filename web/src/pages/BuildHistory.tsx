import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApp } from '../hooks/useApps'
import { getBuildStatus, BuildJob } from '../lib/apiClient'
import { BuildStatusBadge } from '../components/BuildStatusBadge'
import { ApkDownloadButton } from '../components/ApkDownloadButton'

export default function BuildHistory() {
  const { appId } = useParams<{ appId: string }>()
  const app = useApp(appId)

  const { data: latestBuild, isLoading } = useQuery<BuildJob>({
    queryKey: ['buildStatus', appId],
    queryFn:  () => getBuildStatus(appId!),
    enabled:  !!appId,
    staleTime: 0,
  })

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="bg-neutral-0 border-b border-neutral-200 sticky top-0 z-20 shadow-elevation-0">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to={`/app/${appId}`}
            className="w-8 h-8 rounded-md flex items-center justify-center
                       text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700
                       transition-colors duration-150 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-label-lg font-semibold text-neutral-900 truncate">Build history</h1>
            {app && (
              <p className="text-caption-md text-neutral-400 truncate">{app.AppName}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card rounded-lg p-5">
                <div className="skeleton h-4 w-24 rounded-full mb-2" />
                <div className="skeleton h-3 w-40 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !latestBuild && (
          <div className="card rounded-lg text-center py-12 px-8">
            <p className="text-body-sm text-neutral-400 mb-4">No builds found for this app.</p>
            <Link to={`/app/${appId}`} className="btn-secondary inline-flex">
              ← Back to app
            </Link>
          </div>
        )}

        {/* Latest build */}
        {latestBuild && (
          <div className="space-y-4">
            <div className="card rounded-lg p-5 space-y-4">

              {/* Status + version */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BuildStatusBadge status={latestBuild.Status} />
                  {latestBuild.ApkVersion && (
                    <span className="text-label-md font-semibold text-neutral-900">
                      v{latestBuild.ApkVersion}
                    </span>
                  )}
                </div>
                <span className="text-caption-md text-neutral-400 font-mono">
                  {latestBuild.rowKey?.slice(0, 8)}…
                </span>
              </div>

              {/* Metadata */}
              <dl className="space-y-1.5 text-body-sm">
                {[
                  ['Started',   latestBuild.StartedAt   && new Date(latestBuild.StartedAt).toLocaleString()],
                  ['Completed', latestBuild.CompletedAt && new Date(latestBuild.CompletedAt).toLocaleString()],
                  ['GitHub Run', latestBuild.GithubRunId],
                  ['Blob path', latestBuild.ApkBlobPath],
                ].filter(([, v]) => !!v).map(([key, val], i) => (
                  <div key={i} className="flex gap-2">
                    <dt className="text-neutral-400 w-28 flex-shrink-0">{key}</dt>
                    <dd className="text-neutral-700 font-mono text-caption-md truncate">{val as string}</dd>
                  </div>
                ))}
              </dl>

              {/* Error */}
              {latestBuild.ErrorMessage && (
                <div className="alert-error">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-body-sm">{latestBuild.ErrorMessage}</span>
                </div>
              )}

              <ApkDownloadButton job={latestBuild} />
            </div>

            <p className="text-caption-md text-center text-neutral-300">
              Full history is stored in Azure Table Storage (BridgeBuildJobs).
              The most recent build is shown above.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
