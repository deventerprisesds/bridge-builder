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
    queryFn: () => getBuildStatus(appId!),
    enabled: !!appId
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to={`/app/${appId}`} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900">
            Build history — {app?.AppName ?? '…'}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !latestBuild && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <p className="text-gray-500">No builds found for this app.</p>
            <Link to={`/app/${appId}`}
              className="mt-3 inline-block text-blue-600 text-sm hover:underline">
              ← Back to app
            </Link>
          </div>
        )}

        {latestBuild && (
          <div className="space-y-4">
            {/* Only the latest build is returned by the API currently */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <BuildStatusBadge status={latestBuild.Status} />
                  {latestBuild.ApkVersion && (
                    <span className="text-sm font-medium text-gray-900">
                      v{latestBuild.ApkVersion}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono">{latestBuild.rowKey}</span>
              </div>

              <dl className="space-y-1.5 text-sm text-gray-600 mb-4">
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-28">Started</dt>
                  <dd>{new Date(latestBuild.StartedAt).toLocaleString()}</dd>
                </div>
                {latestBuild.CompletedAt && (
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-28">Completed</dt>
                    <dd>{new Date(latestBuild.CompletedAt).toLocaleString()}</dd>
                  </div>
                )}
                {latestBuild.GithubRunId && (
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-28">GitHub Run</dt>
                    <dd className="font-mono text-xs">{latestBuild.GithubRunId}</dd>
                  </div>
                )}
                {latestBuild.ApkBlobPath && (
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-28">Blob path</dt>
                    <dd className="font-mono text-xs truncate">{latestBuild.ApkBlobPath}</dd>
                  </div>
                )}
              </dl>

              {latestBuild.ErrorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {latestBuild.ErrorMessage}
                </div>
              )}

              <ApkDownloadButton job={latestBuild} />
            </div>

            <p className="text-xs text-center text-gray-400">
              Full build history is stored in Azure Table Storage (BridgeBuildJobs).
              Only the latest build is shown here.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
