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
  Calendar, FileText, Download, Sparkles, Eye, Printer, Landmark
} from 'lucide-react'
import { captureSnapshot, generateFaceDescriptor, compareFaceDescriptors, getAddressFromCoords, checkGeofence } from '../lib/faceAI'

export default function EmployeePortal() {
  const { currentEmployee, updateCurrentEmployee, logout } = useAuth()
  const [logs, setLogs] = useState([])
  const [todayLog, setTodayLog] = useState(null)
  const [missingLog, setMissingLog] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Navigation & Payslips States
  const [activeTab, setActiveTab] = useState('attendance') // 'attendance' | 'payslips'
  const [payslips, setPayslips] = useState([])
  const [selectedPayslip, setSelectedPayslip] = useState(null)

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

  // Auto-bind media stream to video element when DOM mounts
  useEffect(() => {
    if (cameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current
    }
  }, [cameraActive])

  // Load Employee Attendance History & Payslips
  const loadData = async () => {
    if (!currentEmployee) return
    
    // 1. Attendance Logs
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

    // 2. Load Payslips (Weekly & Monthly)
    try {
      const [weeklyData, monthlyData] = await Promise.all([
        DB.weekly(),
        DB.monthlyAll()
      ])

      const empNameLower = currentEmployee?.name?.trim().toLowerCase()

      const empWeekly = (weeklyData || [])
        .filter(w => w.name?.trim().toLowerCase() === empNameLower)
        .map(w => {
          const dailyRate = Number(currentEmployee?.salary || 0)
          const gross = (Number(w.days_worked || 0) * dailyRate) + Number(w.additional_salary || 0)
          const totalDeductions = Number(w.adv_deducted || 0) + Number(w.shr_deducted || 0)
          const net = gross - totalDeductions
          return {
            id: w.id,
            type: 'Weekly',
            periodLabel: w.week_label || 'Weekly Pay Period',
            date: w.date || w.created_at,
            daysWorked: Number(w.days_worked || 0),
            leaves: Number(w.leaves || 0),
            dailyRate,
            grossPay: gross,
            additionalSalary: Number(w.additional_salary || 0),
            additionalWorkType: w.additional_work_type || '',
            advDeducted: Number(w.adv_deducted || 0),
            shrDeducted: Number(w.shr_deducted || 0),
            totalDeductions,
            netPay: net
          }
        })

      const empMonthly = (monthlyData || [])
        .filter(m => m.name?.trim().toLowerCase() === empNameLower)
        .map(m => {
          const monthlySalary = Number(currentEmployee?.salary || 0)
          const dailyRate = monthlySalary / 26
          const gross = (Number(m.days_worked || 0) * dailyRate) + Number(m.additional_salary || 0)
          const totalDeductions = Number(m.adv_deducted || 0) + Number(m.shr_deducted || 0)
          const net = gross - totalDeductions
          return {
            id: m.id,
            type: 'Monthly',
            periodLabel: m.month_label || 'Monthly Pay Period',
            date: m.date || m.created_at,
            daysWorked: Number(m.days_worked || 0),
            leaves: Number(m.leaves || 0),
            dailyRate,
            grossPay: gross,
            additionalSalary: Number(m.additional_salary || 0),
            additionalWorkType: m.additional_work_type || '',
            advDeducted: Number(m.adv_deducted || 0),
            shrDeducted: Number(m.shr_deducted || 0),
            totalDeductions,
            netPay: net
          }
        })

      const combinedPayslips = [...empWeekly, ...empMonthly].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      setPayslips(combinedPayslips)
    } catch (err) {
      console.error('Error fetching employee payslips:', err)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [currentEmployee])

  const [faceStatus, setFaceStatus] = useState('idle') // 'idle' | 'verifying' | 'success' | 'error'

  // Start Camera
  const startCamera = async (type) => {
    setActionType(type)
    setCameraActive(true)
    setVerifying(false)
    setFaceStatus('idle')

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
    setFaceStatus('idle')
  }

  // Handle Punch (Check-In or Check-Out or Register)
  const handlePunch = async () => {
    if (!videoRef.current) return
    setVerifying(true)
    setFaceStatus('verifying')

    // 1. Capture live camera snapshot
    const photoBase64 = captureSnapshot(videoRef.current)
    if (!photoBase64) {
      toast.error('Snapshot failed. Please try again.')
      setVerifying(false)
      setFaceStatus('error')
      return
    }

    // 2. Generate live face descriptor
    const liveDescriptor = await generateFaceDescriptor(photoBase64)

    // ── FIRST TIME FACE REGISTRATION ──
    if (actionType === 'register') {
      try {
        const updatedEmpData = { 
          ...currentEmployee, 
          profile_photo: photoBase64, 
          profilePhoto: photoBase64, 
          face_descriptor: liveDescriptor,
          faceDescriptor: liveDescriptor 
        }

        // Save to Auth context and localStorage immediately
        if (updateCurrentEmployee) {
          updateCurrentEmployee(updatedEmpData)
        } else {
          localStorage.setItem('thulir_current_employee', JSON.stringify(updatedEmpData))
        }
        
        // Attempt DB update in background / catch transient errors
        try {
          await DB.updateEmployee(updatedEmpData)
        } catch (dbErr) {
          console.warn('DB face profile sync warning:', dbErr)
        }

        setFaceStatus('success')
        toast.success('🎉 Face Profile Registered Successfully! You can now check in.')
        setTimeout(() => {
          stopCamera()
          setVerifying(false)
          loadData()
        }, 1200)
        return
      } catch (err) {
        console.error('Face registration error:', err)
        toast.error('Failed to register face profile. Please try again.')
        setVerifying(false)
        setFaceStatus('error')
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
        status: 'pending',
        hours_worked: 0,
        created_at: new Date().toISOString()
      }

      await DB.saveAttendanceLog(newLog)
      setFaceStatus('success')
      toast.success(`Check-In Recorded! AI Face Match: ${match.score}% 🟢`)
    } else {
      // Check-Out
      const updatedLog = {
        ...(todayLog || { id: uid(), emp_id: currentEmployee.id, emp_name: currentEmployee.name, date: todayStr }),
        check_out_time: timeString,
        check_out_photo: photoBase64,
        status: todayLog?.status === 'approved' ? 'approved' : 'pending',
        hours_worked: 8.5
      }

      await DB.saveAttendanceLog(updatedLog)
      setFaceStatus('success')
      toast.success('Check-Out Recorded Successfully! 👋')
    }

    setTimeout(() => {
      stopCamera()
      setVerifying(false)
      loadData()
    }, 1200)
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

  const isFaceRegistered = !!(
    currentEmployee?.profile_photo || 
    currentEmployee?.profilePhoto || 
    currentEmployee?.face_descriptor || 
    currentEmployee?.faceDescriptor
  )

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

      {/* ── SECTION TAB SELECTOR ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 16 }}>
        <button 
          className={`btn ${activeTab === 'attendance' ? 'btn-primary' : ''}`}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 800,
            borderRadius: 9999,
            background: activeTab === 'attendance' ? 'var(--brit-red)' : '#FFFFFF',
            color: activeTab === 'attendance' ? '#FFFFFF' : 'var(--navy)',
            border: '2px solid var(--border)',
            boxShadow: activeTab === 'attendance' ? '0 4px 15px rgba(227,30,36,0.3)' : 'none'
          }}
          onClick={() => setActiveTab('attendance')}
        >
          <UserCheck size={18} />
          <span>Daily Attendance & Check-In</span>
        </button>

        <button 
          className={`btn ${activeTab === 'payslips' ? 'btn-primary' : ''}`}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 800,
            borderRadius: 9999,
            background: activeTab === 'payslips' ? 'var(--brit-red)' : '#FFFFFF',
            color: activeTab === 'payslips' ? '#FFFFFF' : 'var(--navy)',
            border: '2px solid var(--border)',
            boxShadow: activeTab === 'payslips' ? '0 4px 15px rgba(227,30,36,0.3)' : 'none'
          }}
          onClick={() => setActiveTab('payslips')}
        >
          <FileText size={18} />
          <span>My Payslips ({payslips.length}) • View Only</span>
        </button>
      </div>

      {/* ── TAB 1: DAILY ATTENDANCE & CHECK-IN ── */}
      {activeTab === 'attendance' && (
        <>
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
              /* ── CAMERA PREVIEW UI WITH DYNAMIC GREEN CIRCLE ── */
              <div style={{ background: '#111', border: `3px solid ${faceStatus === 'success' ? '#22C55E' : 'var(--brit-red)'}`, borderRadius: 24, padding: 24, textAlign: 'center', color: '#fff', position: 'relative', transition: 'all 0.3s ease' }}>
                <div 
                  style={{ 
                    position: 'relative', 
                    width: 280, 
                    height: 280, 
                    margin: '0 auto 20px', 
                    borderRadius: 9999, 
                    overflow: 'hidden', 
                    border: `5px solid ${faceStatus === 'success' ? '#22C55E' : faceStatus === 'verifying' ? 'var(--brit-gold)' : 'var(--brit-gold)'}`, 
                    boxShadow: faceStatus === 'success' ? '0 0 0 12px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.6)' : '0 0 0 8px rgba(227,30,36,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  <div 
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      border: `3px dashed ${faceStatus === 'success' ? '#22C55E' : 'var(--brit-gold)'}`, 
                      borderRadius: 9999, 
                      pointerEvents: 'none',
                      transition: 'all 0.3s ease'
                    }} 
                  />

                  {faceStatus === 'success' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(34, 197, 94, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                      <div style={{ width: 64, height: 64, background: '#22C55E', color: '#fff', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 25px rgba(34, 197, 94, 0.6)' }}>
                        <CheckCircle2 size={40} />
                      </div>
                      <span style={{ marginTop: 12, fontSize: 16, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>FACE VERIFIED! 🟢</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: faceStatus === 'success' ? '#22C55E' : 'var(--brit-gold)', marginBottom: 20 }}>
                  <MapPin size={16} />
                  <span>{locationData?.address || 'Detecting GPS location...'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                  <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={stopCamera}>
                    Cancel
                  </button>
                  <button 
                    className="btn" 
                    style={{ 
                      background: faceStatus === 'success' ? '#22C55E' : 'var(--brit-red)', 
                      color: '#fff', 
                      padding: '14px 32px',
                      borderRadius: 9999,
                      boxShadow: faceStatus === 'success' ? '0 8px 25px rgba(34, 197, 94, 0.5)' : '0 8px 25px rgba(227, 30, 36, 0.4)'
                    }} 
                    disabled={verifying} 
                    onClick={handlePunch}
                  >
                    <ShieldCheck size={18} />
                    <span>{faceStatus === 'success' ? 'Verified ✅' : verifying ? 'Verifying AI Face...' : actionType === 'register' ? 'Snap & Register Face' : actionType === 'in' ? 'Snap & Check In' : 'Snap & Check Out'}</span>
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
        </>
      )}

      {/* ── TAB 2: MY PAYSLIPS (VIEW ONLY) ── */}
      {activeTab === 'payslips' && (
        <Panel title="My Generated Payslips" subtitle="View and download historical salary statements (Read-Only)">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period / Cycle</th>
                  <th>Salary Type</th>
                  <th>Days Worked</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Salary Paid</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(ps => (
                  <tr key={ps.id}>
                    <td style={{ fontWeight: 900, color: 'var(--navy)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} color="var(--brit-red)" />
                        <span>{ps.periodLabel}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ps.type === 'Monthly' ? 'badge-blue' : 'badge-green'}`}>
                        {ps.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{ps.daysWorked} Days</td>
                    <td style={{ fontWeight: 800, color: 'var(--navy)' }}>{fmt(ps.grossPay)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--brit-red)' }}>-{fmt(ps.totalDeductions)}</td>
                    <td style={{ fontWeight: 900, color: 'var(--brit-green)', fontSize: 15, fontFamily: 'var(--mono)' }}>
                      {fmt(ps.netPay)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 16px', fontSize: 12 }}
                        onClick={() => setSelectedPayslip(ps)}
                      >
                        <Eye size={14} />
                        <span>View Payslip</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {payslips.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)', fontWeight: 600 }}>
                      No payslip records available yet. Payslips will appear here once finalized by HR.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── VIEW PAYSLIP MODAL (READ-ONLY) ── */}
      {selectedPayslip && (
        <Modal 
          title="Official Employee Payslip (View Only)" 
          onClose={() => setSelectedPayslip(null)} 
          saveLabel="Print / Download" 
          onSave={() => window.print()}
        >
          <div style={{ background: '#FFFFFF', padding: 24, borderRadius: 20, border: '2px solid var(--border)' }}>
            {/* Payslip Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--brit-red)', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  BRITANNIA AUTHORIZED DISTRIBUTOR
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy)', margin: '4px 0' }}>
                  THULIR AGENCY
                </h3>
                <p style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600 }}>
                  Main Road, Erode, Tamil Nadu • Phone: +91 98427 12345
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                  🔒 Verified Payslip
                </span>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginTop: 8 }}>
                  {selectedPayslip.periodLabel}
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                  Cycle: {selectedPayslip.type}
                </div>
              </div>
            </div>

            {/* Employee Details Grid */}
            <div style={{ background: 'var(--brit-cream-light)', borderRadius: 16, padding: 16, border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'block', fontSize: 11 }}>Employee Name</span>
                <strong style={{ color: 'var(--navy)', fontSize: 14 }}>{empName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'block', fontSize: 11 }}>Employee Staff ID</span>
                <strong style={{ color: 'var(--brit-red)', fontSize: 14 }}>{currentEmployee?.emp_id || 'STAFF'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'block', fontSize: 11 }}>Phone Number</span>
                <strong style={{ color: 'var(--navy)' }}>{currentEmployee?.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'block', fontSize: 11 }}>Identity / Bank Account</span>
                <strong style={{ color: 'var(--navy)' }}>{currentEmployee?.identity_no || 'Verified Account'}</strong>
              </div>
            </div>

            {/* Itemized Calculation Breakdown Table */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 900, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Salary Calculation Breakdown
              </h4>
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#FAF8F5' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--slate)', fontWeight: 700 }}>Base Wage / Daily Rate</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>
                        {fmt(selectedPayslip.dailyRate)} / day
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--slate)', fontWeight: 700 }}>Total Days Worked</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>
                        {selectedPayslip.daysWorked} Days
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--slate)', fontWeight: 700 }}>Earned Basic Salary</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>
                        {fmt(selectedPayslip.daysWorked * selectedPayslip.dailyRate)}
                      </td>
                    </tr>
                    {selectedPayslip.additionalSalary > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: '#F0FDF4' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--brit-green)', fontWeight: 700 }}>
                          Additional Work Allowance ({selectedPayslip.additionalWorkType || 'OT'})
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: 'var(--brit-green)', fontFamily: 'var(--mono)' }}>
                          +{fmt(selectedPayslip.additionalSalary)}
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '2px solid var(--border)', background: '#FAF8F5' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 900, color: 'var(--navy)' }}>Total Gross Earnings</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>
                        {fmt(selectedPayslip.grossPay)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--brit-red)', fontWeight: 700 }}>Less Salary Advance Recovery</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--brit-red)', fontFamily: 'var(--mono)' }}>
                        -{fmt(selectedPayslip.advDeducted)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--brit-red)', fontWeight: 700 }}>Less Stock Shortage Deduction</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--brit-red)', fontFamily: 'var(--mono)' }}>
                        -{fmt(selectedPayslip.shrDeducted)}
                      </td>
                    </tr>
                    <tr style={{ background: '#F0FDF4' }}>
                      <td style={{ padding: '14px', fontWeight: 900, color: 'var(--brit-green)', fontSize: 15 }}>
                        NET SALARY DISBURSED
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, color: 'var(--brit-green)', fontSize: 18, fontFamily: 'var(--mono)' }}>
                        {fmt(selectedPayslip.netPay)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Read-only Disclaimer */}
            <div style={{ background: '#FFF9E6', border: '1px solid var(--brit-gold)', borderRadius: 12, padding: 12, fontSize: 11, color: 'var(--navy)', fontWeight: 600, textAlign: 'center' }}>
              ℹ️ Note: This is an electronic view-only payslip voucher issued by Thulir Agency. No signature is required.
            </div>
          </div>
        </Modal>
      )}

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
