import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { msalInstance, loginRequest, getCurrentUser } from '../lib/b2cAuth'

export default function Auth() {
  const navigate = useNavigate()

  useEffect(() => {
    if (getCurrentUser()) navigate('/')
  }, [navigate])

  const handleLogin = async () => {
    try {
      await msalInstance.loginPopup(loginRequest)
      navigate('/')
    } catch (err) {
      console.error('Login failed', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl border border-gray-200 w-80 text-center shadow-sm">
        {/* Logo */}
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold mb-1 text-gray-900">Bridge Builder</h1>
        <p className="text-gray-500 text-sm mb-6">Build Android apps from your webapps</p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300
                     rounded-lg px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          {/* Google logo SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Access restricted to authorised users
        </p>
      </div>
    </div>
  )
}
