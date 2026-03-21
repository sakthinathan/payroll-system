import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const NAV = [
  { section: 'Overview', items: [
    { to: '/', icon: '📊', label: 'Dashboard' }
  ]},
  { section: 'Master Data', items: [
    { to: '/employees', icon: '👥', label: 'Employees' },
    { to: '/bank', icon: '🏦', label: 'Bank Master' },
  ]},
  { section: 'Transactions', items: [
    { to: '/periods', icon: '📆', label: 'Payroll Periods' },
    { to: '/weekly', icon: '📅', label: 'Weekly Entry' },
    { to: '/advances', icon: '💰', label: 'Advance Log' },
    { to: '/shortages', icon: '⚠️', label: 'Shortage Log' },
  ]},
  { section: 'Reports', items: [
    { to: '/deductions', icon: '📋', label: 'Deduction Master' },
    { to: '/payslip', icon: '🧾', label: 'Payslip' },
  ]},
  { section: 'Downloads', items: [
    { to: '/downloads', icon: '📥', label: 'Downloads' },
  ]},
  { section: 'Data', items: [
    { to: '/backup', icon: '💾', label: 'Backup & Export' },
    { to: '/changepw', icon: '🔑', label: 'Change Password' },
  ]},
]

export function Sidebar() {
  return (
    <aside id="sidebar">
      <div className="sidebar-logo">
        <h1>💼 Thulir Agency</h1>
        <span>Payroll Management · Cloud</span>
      </div>
      {NAV.map(({ section, items }) => (
        <div key={section}>
          <div className="nav-section">{section}</div>
          <nav>
            {items.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="icon">{icon}</span> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
      <div className="sidebar-footer">
        ☁️ Data stored in Supabase cloud<br />
        <span style={{ color: 'rgba(255,255,255,.5)' }}>v2.0 React · Thulir Agency</span>
      </div>
    </aside>
  )
}

export function Topbar({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div id="topbar">
      <h2 id="pageTitle">{title}</h2>
      <div className="flex-gap">
        <div className="meta">{today}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, paddingLeft: 16, borderLeft: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 11, background: '#e2efda', color: '#375623', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>☁️ Cloud</span>
          <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>👤 {user?.username}</span>
          <button onClick={() => navigate('/changepw')}
            style={{ background: 'var(--grey)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            🔑
          </button>
          <button onClick={logout}
            style={{ background: '#fee2e2', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font)' }}>
            ⬅️ Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export function Layout({ title, children }) {
  return (
    <div id="app">
      <Sidebar />
      <main id="main">
        <Topbar title={title} />
        <div id="content">{children}</div>
      </main>
    </div>
  )
}
