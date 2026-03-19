import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/auth'
import { useEffect } from 'react'
import { DB } from './lib/db'

import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Employees    from './pages/Employees'
import { Advances, Shortages, Deductions, Bank, ChangePassword } from './pages/Other'
import { Weekly, Periods } from './pages/WeeklyPeriods'
import { Payslip, Backup } from './pages/PayslipBackup'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) DB.seed().catch(() => {})
  }, [user])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/employees" element={<Protected><Employees /></Protected>} />
      <Route path="/weekly" element={<Protected><Weekly /></Protected>} />
      <Route path="/periods" element={<Protected><Periods /></Protected>} />
      <Route path="/advances" element={<Protected><Advances /></Protected>} />
      <Route path="/shortages" element={<Protected><Shortages /></Protected>} />
      <Route path="/deductions" element={<Protected><Deductions /></Protected>} />
      <Route path="/bank" element={<Protected><Bank /></Protected>} />
      <Route path="/payslip" element={<Protected><Payslip /></Protected>} />
      <Route path="/backup" element={<Protected><Backup /></Protected>} />
      <Route path="/changepw" element={<Protected><ChangePassword /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { fontFamily: 'var(--font)', fontSize: 13 } }} />
      </AuthProvider>
    </HashRouter>
  )
}
