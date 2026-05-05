import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '../config/branding'
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
      { path: '/changepw', label: 'Change Password', icon: <Key size={18} /> },
    ]}
  ]

  return (
    <div id="app">
      <div className="app-bg" />
      
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', zIndex: 900 }}
          />
        )}
      </AnimatePresence>

      <aside id="sidebar" className={isMenuOpen ? 'open' : ''}>
        <nav style={{ paddingTop: 20, paddingBottom: 40 }}>
          {navItems.map(sec => (
            <div key={sec.section}>
              <div className="nav-section">{sec.section}</div>
              {sec.items.map(item => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
                  <span className="icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          
          <div style={{ marginTop: 24, padding: '0 12px' }}>
            <button onClick={logout} className="btn" style={{ width: '100%', background: 'var(--grey)', color: 'var(--rose)', border: 'none', justifyContent: 'flex-start', padding: '10px 16px', borderRadius: 8 }}>
              <LogOut size={16} />
              <span style={{ fontWeight: 600, marginLeft: 12, fontSize: 13 }}>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      <main id="main">
        <header id="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'var(--blue)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={20} color="#fff" />
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{BRAND.name}</h1>
            </div>
            
            <div className="desktop-only" style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.1)' }} />
            
            <div className="desktop-only">
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{title}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="desktop-only" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>System Administrator</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>{BRAND.name}</div>
            </div>
            <div 
              style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              onClick={() => navigate('/changepw')}
            >
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <button className="mobile-only btn" style={{ padding: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => setIsMenuOpen(true)}>
              <Menu size={20} />
            </button>
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
