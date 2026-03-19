import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const doLogin = async () => {
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    const ok = login(username, password)
    if (ok) {
      navigate('/')
    } else {
      setLoading(false)
      setError('❌ Incorrect username or password')
      setShake(true)
      setTimeout(() => setShake(false), 400)
      setPassword('')
    }
  }

  const handleKey = e => { if (e.key === 'Enter') doLogin() }

  return (
    <div id="loginPage" className="active">
      <div className="login-wrapper">
        <div className="company-header">
          <div className="company-logo">💼</div>
          <div className="company-name">THULIR AGENCY</div>
          <div className="company-addr">Perundurai Road, Erode</div>
        </div>

        <div className={`login-card${shake ? ' shake' : ''}`}>
          <div className="card-title">Welcome back 👋</div>
          <div className="card-sub">Sign in to access the Payroll System</div>

          <div className="login-field">
            <label>Username</label>
            <div className="login-input-wrap">
              <span className="login-icon">👤</span>
              <input
                type="text"
                className="login-input"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('pwInput').focus()}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-input-wrap">
              <span className="login-icon">🔒</span>
              <input
                id="pwInput"
                type={showPw ? 'text' : 'password'}
                className={`login-input${error ? ' lerr' : ''}`}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="current-password"
              />
              <button className="pw-toggle" onClick={() => setShowPw(!showPw)} type="button">
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            {error && <div className="login-error show">{error}</div>}
          </div>

          <button className={`login-btn${loading ? ' loading' : ''}`} onClick={doLogin} disabled={loading}>
            <span className="lbtn-txt">Sign In →</span>
            <div className="lspin" />
          </button>

          <div className="hint-box">
            <p>🔑 Default credentials</p>
            <div className="hint-creds">
              <span>Username: admin</span>
              <span>Password: thulir123</span>
            </div>
          </div>
        </div>

        <div className="login-footer">Thulir Agency Payroll v2.0 React · Cloud (Supabase)</div>
      </div>
    </div>
  )
}
