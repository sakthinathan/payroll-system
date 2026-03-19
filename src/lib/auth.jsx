import { createContext, useContext, useState, useEffect } from 'react'
import { DB } from '../lib/db'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = sessionStorage.getItem('prl_session')
    if (s) { try { setUser(JSON.parse(s)) } catch {} }
    setLoading(false)
  }, [])

  const login = (username, password) => {
    const users = DB.getUsers()
    const found = users.find(u => u.username === username.toLowerCase() && u.password === btoa(password))
    if (!found) return false
    const sess = { loggedIn: true, username: found.username, role: found.role, loginTime: new Date().toISOString() }
    sessionStorage.setItem('prl_session', JSON.stringify(sess))
    setUser(sess)
    return true
  }

  const logout = () => {
    sessionStorage.removeItem('prl_session')
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
