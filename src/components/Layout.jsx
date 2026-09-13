import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '../config/branding'
import { Modal, Field } from './UI'
import toast from 'react-hot-toast'
import { 
  LayoutDashboard, Users, CalendarDays, History, 
  Wallet, AlertTriangle, Landmark, FileText, 
  Download, Database, Key, LogOut, Menu, X,
  User, Settings, Info, ChevronDown, UserCheck, ShieldCheck, Camera
} from 'lucide-react'

export function Layout({ children, title }) {
  const { user, role, currentEmployee, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'profile' | 'settings' | 'about'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    setIsMenuOpen(false)
    setProfileMenuOpen(false)
    if (location.pathname && location.pathname !== '/login') {
      localStorage.setItem('last_visited_route', location.pathname)
    }
  }, [location.pathname])

  const navItems = role === 'employee' ? [
    { section: 'Self-Service', items: [
      { path: '/my-attendance', label: 'My Attendance & Punch', icon: <UserCheck size={18} /> },
      { path: '/my-payslips', label: 'My Payslips (View Only)', icon: <FileText size={18} /> },
      { path: '/my-face', label: 'Registered Face Profile', icon: <Camera size={18} /> },
    ]}
  ] : [
    { section: 'Overview', items: [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ]},
    { section: 'Personnel', items: [
      { path: '/employees', label: 'Employees', icon: <Users size={18} /> },
      { path: '/attendance-approval', label: 'Attendance Review', icon: <ShieldCheck size={18} /> },
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
            {/* ── TOP RIGHT USER PROFILE DROPDOWN MENU ── */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '6px 12px', borderRadius: 9999, background: profileMenuOpen ? 'var(--brit-cream-light)' : 'transparent', border: profileMenuOpen ? '1px solid var(--border)' : '1px solid transparent', transition: 'all 0.2s ease' }}
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                <div className="desktop-only" style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>{role === 'employee' ? (currentEmployee?.name || 'Employee') : 'System Administrator'}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: '1px' }}>{role === 'employee' ? 'Thulir Staff' : 'Thulir Agency'}</div>
                </div>
                <div 
                  style={{ width: 40, height: 40, borderRadius: 9999, background: 'var(--brit-red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, border: '2px solid var(--brit-gold)', boxShadow: '0 4px 15px rgba(227, 30, 36, 0.3)' }}
                >
                  {role === 'employee' ? (currentEmployee?.name?.[0]?.toUpperCase() || 'E') : (user?.email?.[0].toUpperCase() || 'A')}
                </div>
                <ChevronDown size={16} color="var(--navy)" style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* POPDOWN MENU POPOVER */}
              <AnimatePresence>
                {profileMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1100 }} onClick={() => setProfileMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: '125%',
                        right: 0,
                        width: 240,
                        background: '#FFFFFF',
                        border: '2px solid var(--border)',
                        borderRadius: 20,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                        zIndex: 1200,
                        overflow: 'hidden',
                        padding: '8px 0'
                      }}
                    >
                      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--navy)' }}>{role === 'employee' ? (currentEmployee?.name || 'Employee') : 'System Administrator'}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', wordBreak: 'break-all' }}>{role === 'employee' ? `${currentEmployee?.emp_id || 'EMP'} • Staff Access` : (user?.email || 'admin@thuliragency.com')}</div>
                      </div>

                      <button 
                        className="popover-item"
                        onClick={() => { setProfileMenuOpen(false); setActiveModal('profile') }}
                      >
                        <User size={16} color="var(--brit-red)" />
                        <span>{role === 'employee' ? 'My Profile' : 'Profile'}</span>
                      </button>

                      {role !== 'employee' && (
                        <button 
                          className="popover-item"
                          onClick={() => { setProfileMenuOpen(false); setActiveModal('settings') }}
                        >
                          <Settings size={16} color="var(--brit-red)" />
                          <span>Settings</span>
                        </button>
                      )}

                      {role !== 'employee' && (
                        <button 
                          className="popover-item"
                          onClick={() => { setProfileMenuOpen(false); navigate('/changepw') }}
                        >
                          <Key size={16} color="var(--brit-red)" />
                          <span>Change Password</span>
                        </button>
                      )}

                      <button 
                        className="popover-item"
                        onClick={() => { setProfileMenuOpen(false); setActiveModal('about') }}
                      >
                        <Info size={16} color="var(--brit-red)" />
                        <span>About System</span>
                      </button>

                      <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 0', paddingTop: 6 }}>
                        <button 
                          className="popover-item"
                          onClick={() => { setProfileMenuOpen(false); logout() }}
                        >
                          <LogOut size={16} color="var(--brit-red)" />
                          <span style={{ color: 'var(--brit-red)', fontWeight: 800 }}>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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

      {/* ── MODALS FOR PROFILE, SETTINGS, ABOUT ── */}
      {activeModal === 'profile' && (
        role === 'employee' ? (
          <Modal title="My Employee Profile" onClose={() => setActiveModal(null)} saveLabel="Close" onSave={() => setActiveModal(null)}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              {currentEmployee?.profile_photo ? (
                <img src={currentEmployee.profile_photo} alt="Profile" style={{ width: 80, height: 80, borderRadius: 9999, objectFit: 'cover', margin: '0 auto 16px', border: '3px solid var(--brit-gold)', boxShadow: '0 8px 25px rgba(227,30,36,0.3)' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 9999, background: 'var(--brit-red)', color: '#fff', fontSize: 28, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '3px solid var(--brit-gold)', boxShadow: '0 8px 25px rgba(227,30,36,0.3)' }}>
                  {currentEmployee?.name?.[0]?.toUpperCase() || 'E'}
                </div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy)' }}>{currentEmployee?.name}</h3>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brit-red)' }}>{currentEmployee?.emp_id || 'STAFF ID'}</p>
            </div>
            <div style={{ background: 'var(--brit-cream-light)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Role</span>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>Agency Staff Member</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Phone Number</span>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{currentEmployee?.phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Salary Cycle</span>
                <span className="badge badge-blue">{currentEmployee?.salary_type === 'monthly' ? 'Monthly Staff' : 'Weekly Staff'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Base Rate / Salary</span>
                <span style={{ fontWeight: 900, color: 'var(--brit-green)', fontFamily: 'var(--mono)' }}>₹{Number(currentEmployee?.salary || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Identity / Account No</span>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{currentEmployee?.identity_no || 'Verified Account'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Status</span>
                <span className="badge badge-green">Active Employee</span>
              </div>
            </div>
          </Modal>
        ) : (
          <Modal title="Admin Profile" onClose={() => setActiveModal(null)} saveLabel="Close" onSave={() => setActiveModal(null)}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: 9999, background: 'var(--brit-red)', color: '#fff', fontSize: 28, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '3px solid var(--brit-gold)', boxShadow: '0 8px 25px rgba(227,30,36,0.3)' }}>
                {user?.email?.[0].toUpperCase() || 'A'}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy)' }}>System Administrator</h3>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brit-red)' }}>{user?.email || 'admin@thuliragency.com'}</p>
            </div>
            <div style={{ background: 'var(--brit-cream-light)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Role</span>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>Super Admin</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Agency</span>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>Thulir Agency</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Theme Edition</span>
                <span className="badge badge-red">Britannia FMCG Red</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--slate)' }}>Status</span>
                <span className="badge badge-green">Active Session</span>
              </div>
            </div>
          </Modal>
        )
      )}

      {activeModal === 'settings' && (
        <Modal title="System Settings" onClose={() => setActiveModal(null)} saveLabel="Save Settings" onSave={() => { toast.success('Settings updated'); setActiveModal(null); }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <Field label="Organization Name">
              <input className="form-input" defaultValue="Thulir Agency" readOnly style={{ background: 'var(--brit-cream-light)' }} />
            </Field>
            <Field label="Default Working Days (Per Month)">
              <input className="form-input" type="number" defaultValue={26} />
            </Field>
            <Field label="Primary Theme Palette">
              <input className="form-input" defaultValue="Britannia Red & Cream (#E31E24)" readOnly style={{ background: 'var(--brit-cream-light)' }} />
            </Field>
          </div>
        </Modal>
      )}

      {activeModal === 'about' && (
        <Modal title="About Thulir Payroll" onClose={() => setActiveModal(null)} saveLabel="Got It" onSave={() => setActiveModal(null)}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 64, height: 64, background: 'var(--brit-red)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', boxShadow: '0 8px 25px rgba(227,30,36,0.3)' }}>
              <Landmark size={32} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)' }}>Thulir Payroll System</h3>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brit-red)', letterSpacing: 1, textTransform: 'uppercase', margin: '4px 0 16px' }}>Version 2.5 • Britannia FMCG Edition</p>
            <p style={{ fontSize: 14, color: 'var(--slate)', lineHeight: 1.6, marginBottom: 24 }}>
              Comprehensive FMCG Payroll, Attendance, Advance Recovery, and Stock Shortage tracking application crafted specifically for Thulir Agency.
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)', opacity: 0.6 }}>
              © 2026 Thulir Agency. All Rights Reserved.
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
