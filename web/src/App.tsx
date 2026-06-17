import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getCurrentUser } from './lib/b2cAuth'
import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import AddApp        from './pages/AddApp'
import AppDetail     from './pages/AppDetail'
import BuildHistory  from './pages/BuildHistory'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getCurrentUser() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/add" element={<RequireAuth><AddApp /></RequireAuth>} />
        <Route path="/app/:appId" element={<RequireAuth><AppDetail /></RequireAuth>} />
        <Route path="/app/:appId/history" element={<RequireAuth><BuildHistory /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
