import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/auth'
import { useEffect } from 'react'
import { DB } from './lib/db'

import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Employees    from './pages/Employees'
import { Advances, Shortages, Deductions, Bank, ChangePassword } from './pages/Other'
import { Weekly, Periods } from './pages/WeeklyPeriods'
import { Monthly }         from './pages/MonthlyEntry'
import { MonthlyPeriods }  from './pages/MonthlyPeriods'
import Ledger from './pages/Ledger'
import { Payslip } from './pages/PayslipBackup'
import Downloads    from './pages/Downloads'
import EmployeePortal from './pages/EmployeePortal'
import AttendanceApproval from './pages/AttendanceApproval'

function Protected({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function LoginRoute() {
  const { user, role } = useAuth()
  const location = useLocation()
  const target = location.state?.from?.pathname || (role === 'employee' ? '/my-attendance' : localStorage.getItem('last_visited_route') || '/')
  
  if (user) {
    return <Navigate to={target} replace />
  }
  return <Login />
}

function AppRoutes() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) DB.seed().catch(() => {})
  }, [user])

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/my-attendance" element={<Protected><EmployeePortal /></Protected>} />
      <Route path="/attendance-approval" element={<Protected><AttendanceApproval /></Protected>} />
      <Route path="/employees" element={<Protected><Employees /></Protected>} />
      <Route path="/weekly" element={<Protected><Weekly /></Protected>} />
      <Route path="/periods" element={<Protected><Periods /></Protected>} />
      <Route path="/monthly" element={<Protected><Monthly /></Protected>} />
      <Route path="/ledger" element={<Protected><Ledger /></Protected>} />
      <Route path="/monthly-periods" element={<Protected><MonthlyPeriods /></Protected>} />
      <Route path="/advances" element={<Protected><Advances /></Protected>} />
      <Route path="/shortages" element={<Protected><Shortages /></Protected>} />
      <Route path="/deductions" element={<Protected><Deductions /></Protected>} />
      <Route path="/bank" element={<Protected><Bank /></Protected>} />
      <Route path="/payslip" element={<Protected><Payslip /></Protected>} />
      <Route path="/downloads" element={<Protected><Downloads /></Protected>} />
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
