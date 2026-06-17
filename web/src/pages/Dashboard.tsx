import { Link } from 'react-router-dom'
import { useApps } from '../hooks/useApps'
import { useAuth } from '../hooks/useAuth'
import { AppCard } from '../components/AppCard'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { data: apps, isLoading, error } = useApps()

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Top navigation bar ───────────────────────────────────────────── */}
      <header className="bg-neutral-0 border-b border-neutral-200 sticky top-0 z-20
                         shadow-elevation-0">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-brand-700 flex items-center justify-center
                            shadow-elevation-0 flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-label-lg font-semibold text-neutral-900">Bridge Builder</span>
          </div>

          {/* User + sign-out */}
          <div className="flex items-center gap-4">
            <span className="text-caption-md text-neutral-400 hidden sm:block">
              {user?.username}
            </span>
            <button
              onClick={signOut}
              className="btn-ghost py-1.5 px-3 text-body-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h2 font-bold text-neutral-900">Your webapps</h1>
            {!isLoading && apps && (
              <p className="text-body-sm text-neutral-500 mt-0.5">
                {apps.length} app{apps.length !== 1 ? 's' : ''} configured
              </p>
            )}
          </div>

          <Link to="/add" className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add webapp
          </Link>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5">
                <div className="flex gap-4">
                  <div className="skeleton w-12 h-12 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="skeleton h-3.5 w-3/4 rounded" />
                    <div className="skeleton h-2.5 w-1/2 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert-error rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-body-sm font-medium">
              Failed to load apps: {(error as Error).message}
            </span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && apps?.length === 0 && (
          <div className="card rounded-lg text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center
                            justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-body-lg font-semibold text-neutral-900 mb-1">No webapps yet</h3>
            <p className="text-body-sm text-neutral-500 mb-6 max-w-xs mx-auto">
              Add your first webapp and Bridge Builder will generate a signed Android APK.
            </p>
            <Link to="/add" className="btn-primary inline-flex">
              Add your first webapp
            </Link>
          </div>
        )}

        {/* App grid */}
        {!isLoading && apps && apps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => <AppCard key={app.rowKey} app={app} />)}
          </div>
        )}
      </main>
    </div>
  )
}
