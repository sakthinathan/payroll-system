import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '../config/branding'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Landmark } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || localStorage.getItem('last_visited_route') || '/'

  const doLogin = async (e) => {
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
        <motion.div 
          className="login-card-v2"
        >
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ color: '#0f172a', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Please enter your credentials</p>
          </div>

          <form onSubmit={doLogin}>
            <div className="login-field-v2">
              <label>Email Address</label>
              <div className="login-input-group">
                <span className="icon-left"><Mail size={18} /></span>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@thulir.com"
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
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
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
