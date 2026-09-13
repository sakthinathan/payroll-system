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

  useEffect(() => {
    setIsMenuOpen(false)
    if (location.pathname && location.pathname !== '/login') {
      localStorage.setItem('last_visited_route', location.pathname)
    }
  }, [location.pathname])

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
        <div className="sidebar-logo">
          <div style={{ background: '#fff', width: 34, height: 34, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={20} color="var(--brit-red)" />
          </div>
          <h1>{BRAND.name}</h1>
        </div>

        <nav style={{ paddingTop: 16, paddingBottom: 40 }}>
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
          
          <div style={{ marginTop: 24, padding: '0 14px' }}>
            <button onClick={logout} className="btn" style={{ width: '100%', background: '#FDE8E8', color: 'var(--brit-red)', border: '1px solid #F8B4B4', justifyContent: 'flex-start', padding: '12px 18px', borderRadius: 9999 }}>
              <LogOut size={16} />
              <span style={{ fontWeight: 800, marginLeft: 8, fontSize: 12 }}>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      <main id="main">
        <header id="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'var(--brit-red)', padding: '6px 14px', borderRadius: 9999, color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(227, 30, 36, 0.3)' }}>
                {BRAND.name}
              </div>
            </div>
            
            <div className="desktop-only" style={{ height: 28, width: 2, background: 'var(--border)' }} />
            
            <div className="desktop-only">
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{title}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="desktop-only" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>System Administrator</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: '1px' }}>Thulir Agency</div>
            </div>
            <div 
              style={{ width: 40, height: 40, borderRadius: 9999, background: 'var(--brit-red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, cursor: 'pointer', border: '2px solid var(--brit-gold)', boxShadow: '0 4px 15px rgba(227, 30, 36, 0.3)' }}
              onClick={() => navigate('/changepw')}
            >
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <button className="mobile-only btn" style={{ padding: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--navy)' }} onClick={() => setIsMenuOpen(true)}>
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
