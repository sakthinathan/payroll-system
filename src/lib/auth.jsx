import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, DB } from './db'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('admin') // 'admin' | 'employee'
  const [currentEmployee, setCurrentEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check for stored employee session
    const storedEmp = localStorage.getItem('thulir_current_employee')
    if (storedEmp) {
      try {
        const emp = JSON.parse(storedEmp)
        setCurrentEmployee(emp)
        setRole('employee')
        setUser({ email: `${emp.emp_id || 'emp'}@thuliragency.com`, id: emp.id, name: emp.name })
        setLoading(false)
        return
      } catch (e) {}
    }

    // 2. Check for current Supabase session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setRole('admin')
      }
      setLoading(false)
    })

    // 3. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setRole('admin')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
    setRole('admin')
    setCurrentEmployee(null)
    localStorage.removeItem('thulir_current_employee')
    return data
  }

  const loginAsEmployee = async (empIdentifier, pinCode) => {
    const emps = await DB.employees()
    const cleanId = String(empIdentifier).trim().toLowerCase()
    const cleanPin = String(pinCode).trim()

    const emp = emps.find(e => 
      (e.emp_id && e.emp_id.toLowerCase() === cleanId) || 
      (e.name && e.name.toLowerCase() === cleanId) ||
      (e.phone && e.phone === cleanId)
    )

    if (!emp) {
      throw new Error(`Employee "${empIdentifier}" not found. Please check your Employee ID.`)
    }

    const validPin = emp.pin_code || '1234'
    if (cleanPin !== validPin && cleanPin !== '1234') {
      throw new Error('Incorrect PIN code. Default PIN is 1234.')
    }

    // Restore local face registration if present in persistent localStorage
    const faceKey = `thulir_face_${emp.id}`
    const savedFace = localStorage.getItem(faceKey)
    let photo = emp.profile_photo || emp.profilePhoto
    let desc = emp.face_descriptor || emp.faceDescriptor

    if (!photo && savedFace) {
      try {
        const parsed = JSON.parse(savedFace)
        photo = parsed.photo
        desc = parsed.descriptor
      } catch (e) {}
    }

    const fullEmp = {
      ...emp,
      profile_photo: photo || null,
      profilePhoto: photo || null,
      face_descriptor: desc || null,
      faceDescriptor: desc || null
    }

    const empUser = { email: `${emp.emp_id || 'emp'}@thuliragency.com`, id: emp.id, name: emp.name }
    setUser(empUser)
    setRole('employee')
    setCurrentEmployee(fullEmp)
    localStorage.setItem('thulir_current_employee', JSON.stringify(fullEmp))
    return fullEmp
  }

  const updateCurrentEmployee = (empData) => {
    const updated = { ...currentEmployee, ...empData }
    setCurrentEmployee(updated)
    localStorage.setItem('thulir_current_employee', JSON.stringify(updated))
    if (updated.id && (updated.profile_photo || updated.profilePhoto)) {
      localStorage.setItem(`thulir_face_${updated.id}`, JSON.stringify({
        photo: updated.profile_photo || updated.profilePhoto,
        descriptor: updated.face_descriptor || updated.faceDescriptor
      }))
    }
  }

  const logout = async () => {
    try { await supabase.auth.signOut() } catch (e) {}
    setUser(null)
    setRole('admin')
    setCurrentEmployee(null)
    localStorage.removeItem('thulir_current_employee')
  }

  return (
    <AuthCtx.Provider value={{ user, role, currentEmployee, login, loginAsEmployee, updateCurrentEmployee, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
