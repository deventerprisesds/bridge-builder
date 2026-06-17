import { Link } from 'react-router-dom'
import { App } from '../lib/apiClient'
import { BuildStatusBadge } from './BuildStatusBadge'
import { useBuildStatus } from '../hooks/useBuildStatus'

export function AppCard({ app }: { app: App }) {
  const { data: build } = useBuildStatus(app.rowKey)

  return (
    <Link
      to={`/app/${app.rowKey}`}
      className="block bg-white border border-gray-200 rounded-xl p-5
                 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        {app.IconUrl ? (
          <img
            src={app.IconUrl}
            alt={app.AppName}
            className="w-12 h-12 rounded-xl object-contain border border-gray-100 flex-shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: app.ThemeColor || '#1e40af' }}
          >
            {app.AppName?.[0] ?? '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{app.AppName}</h3>
            {build && <BuildStatusBadge status={build.Status} />}
          </div>
          <p className="text-xs text-gray-500 truncate">{app.BaseUrl}</p>
          {build?.Status === 'ready' && build.ApkVersion && (
            <p className="text-xs text-green-600 mt-1">v{build.ApkVersion} ready</p>
          )}
        </div>

        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
