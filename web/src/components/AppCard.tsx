import { Link } from 'react-router-dom'
import { App } from '../lib/apiClient'
import { BuildStatusBadge } from './BuildStatusBadge'
import { useBuildStatus } from '../hooks/useBuildStatus'

export function AppCard({ app }: { app: App }) {
  const { data: build } = useBuildStatus(app.rowKey)

  return (
    <Link
      to={`/app/${app.rowKey}`}
      className="group block card p-5 hover:shadow-elevation-2 hover:border-brand-200
                 transition-all duration-200 focus-visible:outline-none"
      style={{ ['--tw-shadow' as any]: undefined }}
    >
      <div className="flex items-start gap-4">
        {/* App icon */}
        {app.IconUrl ? (
          <img
            src={app.IconUrl}
            alt={app.AppName}
            className="w-12 h-12 rounded-lg object-contain border border-neutral-100 flex-shrink-0
                       shadow-elevation-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center
                       text-white text-body-lg font-bold shadow-elevation-0"
            style={{ backgroundColor: app.ThemeColor || '#1b4f5c' }}
          >
            {app.AppName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-body-md font-semibold text-neutral-900 truncate">
              {app.AppName}
            </h3>
            {build && <BuildStatusBadge status={build.Status} />}
          </div>

          <p className="text-caption-md text-neutral-400 truncate">{app.BaseUrl}</p>

          {build?.Status === 'ready' && build.ApkVersion && (
            <p className="text-caption-md text-success font-medium">
              v{build.ApkVersion} ready to download
            </p>
          )}
        </div>

        {/* Chevron */}
        <svg
          className="w-4 h-4 text-neutral-300 flex-shrink-0 mt-0.5
                     group-hover:text-brand-400 transition-colors duration-150"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
