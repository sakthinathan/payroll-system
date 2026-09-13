import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '../config/branding'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Landmark, UserCheck, KeyRound } from 'lucide-react'

export default function Login() {
  const [tab, setTab] = useState('admin') // 'admin' | 'employee'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Employee PIN Login fields
  const [empId, setEmpId] = useState('')
  const [pin, setPin] = useState('')

  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginAsEmployee } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || localStorage.getItem('last_visited_route') || '/'

  const doAdminLogin = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Invalid email or password')
      setPassword('')
    }
  }

  const doEmployeeLogin = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAsEmployee(empId, pin)
      navigate('/my-attendance', { replace: true })
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Invalid Employee ID or PIN code.')
    }
  }

  return (
    <div className="login-container bg-mesh" id="loginPage">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}
      >
        {/* Header Section */}
        <div className="login-header-v2">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="login-logo-v2"
          >
            <Landmark size={32} color="#ffffff" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ color: 'var(--brit-red)', fontSize: 28, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}
          >
            {BRAND.name}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ color: 'var(--slate)', fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}
          >
            {BRAND.tagline || 'Smart Automated Payroll System'}
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div className="login-card-v2">
          {/* Tab Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--brit-cream-light)', padding: 4, borderRadius: 9999, marginBottom: 28, border: '1px solid var(--border)' }}>
            <button 
              type="button" 
              onClick={() => { setTab('admin'); setError('') }}
              style={{ padding: '10px 16px', border: 'none', borderRadius: 9999, background: tab === 'admin' ? 'var(--brit-red)' : 'transparent', color: tab === 'admin' ? '#fff' : 'var(--navy)', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Admin Login
            </button>
            <button 
              type="button" 
              onClick={() => { setTab('employee'); setError('') }}
              style={{ padding: '10px 16px', border: 'none', borderRadius: 9999, background: tab === 'employee' ? 'var(--brit-red)' : 'transparent', color: tab === 'employee' ? '#fff' : 'var(--navy)', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Employee Portal
            </button>
          </div>

          {tab === 'admin' ? (
            <form onSubmit={doAdminLogin}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: 'var(--navy)', fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Admin Portal Access</h2>
                <p style={{ color: 'var(--slate)', fontSize: 13, fontWeight: 600 }}>Enter your administrator credentials</p>
              </div>

              <div className="login-field-v2">
                <label>Email Address</label>
                <div className="login-input-group">
                  <span className="icon-left"><Mail size={18} /></span>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="admin@thulir.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field-v2">
                <label>Password</label>
                <div className="login-input-group">
                  <span className="icon-left"><Lock size={18} /></span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="error-toast"
                  >
                    <span>⚠️</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="login-btn-v2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            /* EMPLOYEE PIN LOGIN */
            <form onSubmit={doEmployeeLogin}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: 'var(--navy)', fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Employee Self-Service</h2>
                <p style={{ color: 'var(--slate)', fontSize: 13, fontWeight: 600 }}>Enter Employee ID or Name + 4-digit PIN</p>
              </div>

              <div className="login-field-v2">
                <label>Employee ID / Name / Phone</label>
                <div className="login-input-group">
                  <span className="icon-left"><UserCheck size={18} /></span>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. THULIR_01 or BOOPATHI"
                    value={empId}
                    onChange={e => setEmpId(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field-v2">
                <label>4-Digit PIN Code</label>
                <div className="login-input-group">
                  <span className="icon-left"><KeyRound size={18} /></span>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    className="form-input"
                    placeholder="Default: 1234"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="error-toast"
                  >
                    <span>⚠️</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="login-btn-v2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Verifying Employee...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Employee Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ textAlign: 'center', marginTop: 28, color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}
        >
          SECURE CLOUD ACCESS
        </motion.p>
      </motion.div>
    </div>
  )
}
