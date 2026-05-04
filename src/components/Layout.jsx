import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, Users, CalendarDays, History, 
  Wallet, AlertTriangle, Landmark, FileText, 
  Download, Database, Key, LogOut, Menu, X
} from 'lucide-react'

export function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  // Close menu on route change
  useEffect(() => setIsMenuOpen(false), [location.pathname])

  const navItems = [
    { section: 'Overview', items: [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ]},
    { section: 'Personnel', items: [
      { path: '/employees', label: 'Employees', icon: <Users size={18} /> },
      { path: '/bank', label: 'Bank Master', icon: <Landmark size={18} /> },
    ]},
    { section: 'Payroll Entry', items: [
      { path: '/weekly', label: 'Weekly Entry', icon: <CalendarDays size={18} /> },
      { path: '/monthly', label: 'Monthly Entry', icon: <CalendarDays size={18} /> },
    ]},
    { section: 'Deductions', items: [
      { path: '/advances', label: 'Advance Log', icon: <Wallet size={18} /> },
      { path: '/shortages', label: 'Shortage Log', icon: <AlertTriangle size={18} /> },
      { path: '/deductions', label: 'Deduction Master', icon: <FileText size={18} /> },
    ]},
    { section: 'Records', items: [
      { path: '/periods', label: 'Weekly History', icon: <History size={18} /> },
      { path: '/monthly-periods', label: 'Monthly History', icon: <History size={18} /> },
      { path: '/ledger', label: 'Ledger', icon: <FileText size={18} /> },
    ]},
    { section: 'Reports', items: [
      { path: '/payslip', label: 'Payslip Generator', icon: <FileText size={18} /> },
      { path: '/downloads', label: 'Downloads', icon: <Download size={18} /> },
    ]},
    { section: 'System', items: [
      { path: '/backup', label: 'Backup & Export', icon: <Database size={18} /> },
      { path: '/changepw', label: 'Change Password', icon: <Key size={18} /> },
    ]}
  ]

  return (
    <div id="app">
      <div className="app-bg" />
      
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 90 }}
          />
        )}
      </AnimatePresence>

      <aside id="sidebar" className={isMenuOpen ? 'open' : ''}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>THULIR AGENCY</h1>
              <span>Payroll v2.0</span>
            </div>
            <button className="mobile-only" onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5 }}>
              <X size={24} />
            </button>
          </div>
        </div>

        <nav style={{ paddingBottom: 40 }}>
          {navItems.map(sec => (
            <div key={sec.section}>
              <div className="nav-section">{sec.section}</div>
              {sec.items.map(item => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
                  <span className="icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {location.pathname === item.path && (
                    <motion.div layoutId="active-pill" style={{ position: 'absolute', right: 8, width: 4, height: 16, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
          
          <div style={{ marginTop: 24, padding: '0 16px' }}>
            <button onClick={logout} className="btn" style={{ width: '100%', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', justifyContent: 'flex-start', padding: '12px 20px' }}>
              <LogOut size={18} />
              <span style={{ fontWeight: 700, marginLeft: 12 }}>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      <main id="main">
        <header id="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-only btn" style={{ padding: 8, background: '#fff', border: '1px solid var(--border)' }} onClick={() => setIsMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h2>{title}</h2>
              <div className="meta">{today}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }} className="desktop-only">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'capitalize' }}>Administrator</div>
            </div>
            <div 
              style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
              onClick={() => navigate('/changepw')}
            >
              <div style={{ margin: 'auto' }}>{user?.email?.[0].toUpperCase()}</div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            id="content"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
