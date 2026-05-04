import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '../config/branding'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const doLogin = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Invalid email or password')
      setPassword('')
    }
  }

  return (
    <div className="login-container bg-mesh" id="loginPage" style={{ display: 'flex' }}>
      {/* Animated Background Elements */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, background: 'rgba(46, 117, 182, 0.1)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }}
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, background: 'rgba(31, 56, 100, 0.15)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}
      >
        {/* Header Section */}
        <div className="login-header-v2">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="login-logo-v2 glow-blue"
          >
            <span style={{ fontSize: 42 }}>{BRAND.logoEmoji}</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ color: 'white', fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}
          >
            {BRAND.name}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px' }}
          >
            {BRAND.tagline}
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="login-card-v2 shadow-lg"
        >
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'var(--navy)', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Welcome back</h2>
            <p style={{ color: 'var(--mid)', fontSize: 14 }}>Please enter your credentials</p>
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
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mid)' }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="error-toast"
                >
                  <span style={{ fontSize: 16 }}>⚠️</span> {error}
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
          transition={{ delay: 1 }}
          style={{ textAlign: 'center', marginTop: 32, color: 'rgba(255, 255, 255, 0.3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          {BRAND.address} · {BRAND.footer}
        </motion.p>
      </motion.div>
    </div>
  )
}
