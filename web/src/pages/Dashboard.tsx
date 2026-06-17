import { Link } from 'react-router-dom'
import { useApps } from '../hooks/useApps'
import { useAuth } from '../hooks/useAuth'
import { AppCard } from '../components/AppCard'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { data: apps, isLoading, error } = useApps()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-semibold text-gray-900">Bridge Builder</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.username}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your webapps</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {apps?.length ?? 0} app{apps?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            to="/add"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                       px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add webapp
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Failed to load apps: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && apps?.length === 0 && (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-medium mb-1">No webapps yet</h3>
            <p className="text-gray-500 text-sm mb-4">
              Add your first webapp to generate an Android APK
            </p>
            <Link
              to="/add"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                         text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Add webapp
            </Link>
          </div>
        )}

        {!isLoading && apps && apps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <AppCard key={app.rowKey} app={app} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
