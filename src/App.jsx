import { useState, useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/auth'
import { DB } from './lib/db'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const EmployeePortal = lazy(() => import('./pages/EmployeePortal'))
const AttendanceApproval = lazy(() => import('./pages/AttendanceApproval'))
const Ledger = lazy(() => import('./pages/Ledger'))
const Downloads = lazy(() => import('./pages/Downloads'))

const Advances = lazy(() => import('./pages/Other').then(m => ({ default: m.Advances })))
const Shortages = lazy(() => import('./pages/Other').then(m => ({ default: m.Shortages })))
const Deductions = lazy(() => import('./pages/Other').then(m => ({ default: m.Deductions })))
const Bank = lazy(() => import('./pages/Other').then(m => ({ default: m.Bank })))
const ChangePassword = lazy(() => import('./pages/Other').then(m => ({ default: m.ChangePassword })))

const Weekly = lazy(() => import('./pages/WeeklyPeriods').then(m => ({ default: m.Weekly })))
const Periods = lazy(() => import('./pages/WeeklyPeriods').then(m => ({ default: m.Periods })))
const Monthly = lazy(() => import('./pages/MonthlyEntry').then(m => ({ default: m.Monthly })))
const MonthlyPeriods = lazy(() => import('./pages/MonthlyPeriods').then(m => ({ default: m.MonthlyPeriods })))
const Payslip = lazy(() => import('./pages/PayslipBackup').then(m => ({ default: m.Payslip })))

function RouteLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{
        width: 36, height: 36, border: '3px solid rgba(198, 40, 40, 0.15)',
        borderTopColor: 'var(--brit-red, #C62828)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Protected({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AdminOnly({ children }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (role === 'employee') return <Navigate to="/my-attendance" replace />
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
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<AdminOnly><Dashboard /></AdminOnly>} />
        <Route path="/my-attendance" element={<Protected><EmployeePortal defaultTab="attendance" /></Protected>} />
        <Route path="/my-payslips" element={<Protected><EmployeePortal defaultTab="payslips" /></Protected>} />
        <Route path="/my-face" element={<Protected><EmployeePortal defaultTab="face" /></Protected>} />
        <Route path="/attendance-approval" element={<AdminOnly><AttendanceApproval /></AdminOnly>} />
        <Route path="/employees" element={<AdminOnly><Employees /></AdminOnly>} />
        <Route path="/weekly" element={<AdminOnly><Weekly /></AdminOnly>} />
        <Route path="/periods" element={<AdminOnly><Periods /></AdminOnly>} />
        <Route path="/monthly" element={<AdminOnly><Monthly /></AdminOnly>} />
        <Route path="/ledger" element={<AdminOnly><Ledger /></AdminOnly>} />
        <Route path="/monthly-periods" element={<AdminOnly><MonthlyPeriods /></AdminOnly>} />
        <Route path="/advances" element={<AdminOnly><Advances /></AdminOnly>} />
        <Route path="/shortages" element={<AdminOnly><Shortages /></AdminOnly>} />
        <Route path="/deductions" element={<AdminOnly><Deductions /></AdminOnly>} />
        <Route path="/bank" element={<AdminOnly><Bank /></AdminOnly>} />
        <Route path="/payslip" element={<AdminOnly><Payslip /></AdminOnly>} />
        <Route path="/downloads" element={<AdminOnly><Downloads /></AdminOnly>} />
        <Route path="/changepw" element={<AdminOnly><ChangePassword /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
