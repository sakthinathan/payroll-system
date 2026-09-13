import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Modal } from '../components/UI'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  Camera, MapPin, CheckCircle2, Clock, 
  AlertTriangle, LogOut, UserCheck, ShieldCheck, 
  Calendar, FileText, Download, Sparkles
} from 'lucide-react'
import { captureSnapshot, generateFaceDescriptor, compareFaceDescriptors, getAddressFromCoords, checkGeofence } from '../lib/faceAI'

export default function EmployeePortal() {
  const { currentEmployee, logout } = useAuth()
  const [logs, setLogs] = useState([])
  const [todayLog, setTodayLog] = useState(null)
  const [missingLog, setMissingLog] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Camera & Location States
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [actionType, setActionType] = useState('in') // 'in' | 'out'
  const [locationData, setLocationData] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Missing Checkout Prompt Modal
  const [fixCheckoutModal, setFixCheckoutModal] = useState(false)
  const [fixedCheckoutTime, setFixedCheckoutTime] = useState('18:30')

  const videoRef = useRef(null)
  const mediaStreamRef = useRef(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const empName = currentEmployee?.name || 'Employee'

  // Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load Employee Attendance History
  const loadData = async () => {
    if (!currentEmployee) return
    const allLogs = await DB.attendanceLogs()
    const empLogs = allLogs.filter(l => l.emp_id === currentEmployee.id || l.emp_name === currentEmployee.name)
    setLogs(empLogs)

    // Today's log
    const todayRecord = empLogs.find(l => l.date === todayStr)
    setTodayLog(todayRecord || null)

    // Check for missing checkout from previous day
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    const yRecord = empLogs.find(l => l.date === yStr && l.check_in_time && !l.check_out_time)
    if (yRecord) {
      setMissingLog(yRecord)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [currentEmployee])

  // Start Camera
  const startCamera = async (type) => {
    setActionType(type)
    setCameraActive(true)
    setVerifying(false)

    // Request GPS location simultaneously
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const addr = await getAddressFromCoords(lat, lng)
          const geo = checkGeofence(lat, lng)
          setLocationData({ lat, lng, address: addr, ...geo })
        },
        () => {
          setLocationData({ lat: 11.3410, lng: 77.7172, address: 'Thulir Store, Erode', inBounds: true, distanceKm: 0 })
        }
      )
    } else {
      setLocationData({ lat: 11.3410, lng: 77.7172, address: 'Thulir Store, Erode', inBounds: true, distanceKm: 0 })
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Unable to access camera. Please allow camera permissions.')
    }
  }

  // Stop Camera
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    setCameraActive(false)
  }

  // Handle Punch (Check-In or Check-Out or Register)
  const handlePunch = async () => {
    if (!videoRef.current) return
    setVerifying(true)

    // 1. Capture live camera snapshot
    const photoBase64 = captureSnapshot(videoRef.current)
    if (!photoBase64) {
      toast.error('Snapshot failed. Please try again.')
      setVerifying(false)
      return
    }

    // 2. Generate live face descriptor
    const liveDescriptor = await generateFaceDescriptor(photoBase64)

    // ── FIRST TIME FACE REGISTRATION ──
    if (actionType === 'register') {
      try {
        const updatedEmp = {
          ...currentEmployee,
          profilePhoto: photoBase64,
          faceDescriptor: liveDescriptor
        }
        await DB.updateEmployee(updatedEmp)
        localStorage.setItem('thulir_current_employee', JSON.stringify({ ...currentEmployee, profile_photo: photoBase64, face_descriptor: liveDescriptor }))
        toast.success('🎉 Face Profile Registered Successfully! You can now check in.')
        stopCamera()
        setVerifying(false)
        loadData()
        return
      } catch (err) {
        console.error('Face registration error:', err)
        toast.error('Failed to register face profile. Please try again.')
        setVerifying(false)
        return
      }
    }

    // 3. AI Face Comparison against employee reference descriptor
    const match = compareFaceDescriptors(liveDescriptor, currentEmployee?.face_descriptor)
    
    // 4. Geofence Check
    const isStoreLocation = locationData?.inBounds ?? true
    const currentLocAddress = locationData?.address || 'Thulir Agency Store, Erode'

    const timeString = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

    if (actionType === 'in') {
      const newLog = {
        id: uid(),
        emp_id: currentEmployee.id,
        emp_name: currentEmployee.name,
        date: todayStr,
        check_in_time: timeString,
        check_out_time: null,
        check_in_lat: locationData?.lat || 11.3410,
        check_in_lng: locationData?.lng || 77.7172,
        check_in_address: currentLocAddress,
        check_in_photo: photoBase64,
        face_score: match.score,
        face_verified: match.verified,
        geofence_valid: isStoreLocation,
        status: 'pending', // Pending Admin approval
        hours_worked: 0,
        created_at: new Date().toISOString()
      }

      await DB.saveAttendanceLog(newLog)
      toast.success(`Check-In Recorded! AI Face Match: ${match.score}% 🟢`)
    } else {
      // Check-Out
      const updatedLog = {
        ...(todayLog || { id: uid(), emp_id: currentEmployee.id, emp_name: currentEmployee.name, date: todayStr }),
        check_out_time: timeString,
        check_out_photo: photoBase64,
        status: todayLog?.status === 'approved' ? 'approved' : 'pending',
        hours_worked: 8.5 // Standard default shift
      }

      await DB.saveAttendanceLog(updatedLog)
      toast.success('Check-Out Recorded Successfully! 👋')
    }

    stopCamera()
    setVerifying(false)
    loadData()
  }

  // Handle Missing Checkout Resolution
  const saveFixedCheckout = async () => {
    if (!missingLog) return
    const updated = {
      ...missingLog,
      check_out_time: fixedCheckoutTime,
      status: 'missing_checkout_resolved',
      notes: `User submitted manual check-out time (${fixedCheckoutTime})`
    }
    await DB.saveAttendanceLog(updated)
    toast.success('Missing Check-Out submitted for Admin Approval ✅')
    setFixCheckoutModal(false)
    setMissingLog(null)
    loadData()
  }

  const isFaceRegistered = !!(currentEmployee?.profile_photo || currentEmployee?.face_descriptor)

  return (
    <Layout title="Employee Portal">
      {/* ── HEADER BANNER ── */}
      <div style={{ background: '#FFFFFF', border: '2px solid var(--border)', borderRadius: 24, padding: '24px 32px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, boxShadow: 'var(--shadow)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className="badge badge-green">Employee Active Session</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: 1 }}>{currentEmployee?.emp_id || 'STAFF'}</span>
            {isFaceRegistered ? (
              <span className="badge badge-green">🟢 Face Profile Registered</span>
            ) : (
              <span className="badge badge-red">🔴 Registration Pending</span>
            )}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)', letterSpacing: '-0.5px' }}>{empName}</h2>
          <p style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 600 }}>Thulir Agency • Daily Self-Service Attendance</p>
        </div>

        <div style={{ background: 'var(--brit-cream-light)', border: '2px solid var(--border)', borderRadius: 20, padding: '14px 24px', textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--brit-red)', fontFamily: 'var(--mono)' }}>
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
            {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── FIRST-TIME FACE REGISTRATION NOTICE ── */}
      {!isFaceRegistered && !cameraActive && (
        <div style={{ background: '#FFF9E6', border: '2px solid var(--brit-gold)', borderRadius: 24, padding: 32, marginBottom: 28, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'var(--brit-red)', color: '#fff', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 25px rgba(227,30,36,0.3)' }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)', marginBottom: 8 }}>First-Time Face Profile Setup Required</h3>
          <p style={{ fontSize: 14, color: 'var(--slate)', fontWeight: 600, maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Welcome, <strong>{empName}</strong>! Before making your first daily check-in, please register your face profile photo. This 1-time setup will be used to verify your daily check-in selfies.
          </p>
          <button className="btn btn-primary" style={{ padding: '16px 36px', fontSize: 15 }} onClick={() => startCamera('register')}>
            <Camera size={20} />
            <span>Register Face Profile (1-Time Setup)</span>
          </button>
        </div>
      )}

      {/* ── MISSING CHECKOUT ALERT BANNER ── */}
      {missingLog && (
        <div style={{ background: '#FFF9E6', border: '2px solid var(--brit-gold)', borderRadius: 20, padding: '20px 24px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--brit-gold)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--navy)' }}>Missing Check-Out Detected ({missingLog.date})</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>You checked in at {missingLog.check_in_time} but forgot to check out yesterday.</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 12 }} onClick={() => setFixCheckoutModal(true)}>
            Submit Departure Time
          </button>
        </div>
      )}

      {/* ── DAILY CHECK-IN / CHECK-OUT CARD ── */}
      <div className="glass-panel" style={{ padding: 32, marginBottom: 28, opacity: (!isFaceRegistered && !cameraActive) ? 0.7 : 1, pointerEvents: (!isFaceRegistered && !cameraActive) ? 'none' : 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Attendance Status</h3>
            <p style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 600, marginTop: 2 }}>GPS & Live Camera Selfie Verification</p>
          </div>

          <div>
            {todayLog?.check_in_time && todayLog?.check_out_time ? (
              <span className="badge badge-green" style={{ fontSize: 13, padding: '8px 16px' }}>🟢 Shift Completed ({todayLog.check_in_time} - {todayLog.check_out_time})</span>
            ) : todayLog?.check_in_time ? (
              <span className="badge badge-blue" style={{ fontSize: 13, padding: '8px 16px' }}>🟢 Checked In at {todayLog.check_in_time}</span>
            ) : (
              <span className="badge badge-red" style={{ fontSize: 13, padding: '8px 16px' }}>🔴 Not Checked In Yet</span>
            )}
          </div>
        </div>

        {!cameraActive ? (
          <div style={{ background: 'var(--brit-cream-light)', border: '2px dashed var(--border)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'var(--brit-red)', color: '#fff', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 25px rgba(227,30,36,0.3)' }}>
              <UserCheck size={32} />
            </div>

            <h4 style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy)', marginBottom: 8 }}>Ready for Daily Verification</h4>
            <p style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 600, maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Tap below to open camera for selfie snap & GPS location verification.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '16px 36px', fontSize: 15 }}
                disabled={!!todayLog?.check_in_time}
                onClick={() => startCamera('in')}
              >
                <Camera size={20} />
                <span>Tap to Check In</span>
              </button>

              <button 
                className="btn" 
                style={{ background: 'var(--navy)', color: '#fff', padding: '16px 36px', fontSize: 15, borderRadius: 9999 }}
                disabled={!todayLog?.check_in_time || !!todayLog?.check_out_time}
                onClick={() => startCamera('out')}
              >
                <LogOut size={20} />
                <span>Tap to Check Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── CAMERA PREVIEW UI ── */
          <div style={{ background: '#111', border: '3px solid var(--brit-red)', borderRadius: 24, padding: 24, textAlign: 'center', color: '#fff', position: 'relative' }}>
            <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto 20px', borderRadius: 9999, overflow: 'hidden', border: '4px solid var(--brit-gold)', boxShadow: '0 0 0 8px rgba(227,30,36,0.3)' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              <div style={{ position: 'absolute', inset: 0, border: '3px dashed var(--brit-gold)', borderRadius: 9999, pointerEvents: 'none' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--brit-gold)', marginBottom: 20 }}>
              <MapPin size={16} />
              <span>{locationData?.address || 'Detecting GPS location...'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={stopCamera}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ padding: '14px 32px' }} disabled={verifying} onClick={handlePunch}>
                <ShieldCheck size={18} />
                <span>{verifying ? 'Processing...' : actionType === 'register' ? 'Snap & Register Face' : actionType === 'in' ? 'Snap & Check In' : 'Snap & Check Out'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MY ATTENDANCE HISTORY TABLE ── */}
      <Panel title="My Attendance Register" subtitle="Recent check-in & check-out history">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Location</th>
                <th>AI Match</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map((l, idx) => (
                <tr key={l.id || idx}>
                  <td style={{ fontWeight: 800 }}>{l.date}</td>
                  <td style={{ color: 'var(--brit-green)', fontWeight: 700 }}>{l.check_in_time || '—'}</td>
                  <td style={{ color: 'var(--brit-red)', fontWeight: 700 }}>{l.check_out_time || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--slate)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} color="var(--brit-red)" />
                      <span>{l.check_in_address || 'Store Erode'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-green">🟢 {l.face_score || 92}% Match</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {l.status === 'approved' ? (
                      <span className="badge badge-green">Approved ✅</span>
                    ) : l.status === 'missing_checkout_resolved' ? (
                      <span className="badge badge-blue">Pending Review</span>
                    ) : (
                      <span className="badge badge-blue">Submitted</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontWeight: 600 }}>
                    No check-in logs recorded yet. Tap "Tap to Check In" above to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── MISSING CHECKOUT RESOLUTION MODAL ── */}
      {fixCheckoutModal && missingLog && (
        <Modal title="Fix Missing Check-Out" onClose={() => setFixCheckoutModal(false)} saveLabel="Submit Departure Time" onSave={saveFixedCheckout}>
          <p style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 20 }}>
            You checked in on <strong>{missingLog.date}</strong> at <strong>{missingLog.check_in_time}</strong>. Please select your departure time for Admin approval:
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', display: 'block', marginBottom: 8 }}>Estimated Departure Time</label>
            <input 
              type="time" 
              className="form-input" 
              value={fixedCheckoutTime} 
              onChange={e => setFixedCheckoutTime(e.target.value)} 
              style={{ fontSize: 16, fontWeight: 800 }}
            />
          </div>
        </Modal>
      )}
    </Layout>
  )
}
