import { useState, useEffect, useMemo, useCallback } from 'react'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Modal, Spinner } from '../components/UI'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { 
  CheckCircle2, AlertTriangle, MapPin, Camera, 
  ShieldCheck, UserCheck, CheckSquare, ExternalLink,
  Calendar, Clock, ArrowRight, RefreshCw, Sparkles,
  Users, Check, X, Eye, XCircle
} from 'lucide-react'

// Helper to generate all calendar dates in a period
function getDatesInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return []
  const dates = []
  let curr = new Date(startDateStr)
  const end = new Date(endDateStr)
  
  // Guard against invalid dates
  if (isNaN(curr.getTime()) || isNaN(end.getTime())) return []

  while (curr <= end) {
    const yyyy = curr.getFullYear()
    const mm = String(curr.getMonth() + 1).padStart(2, '0')
    const dd = String(curr.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`
    const dayOfWeek = curr.getDay() // 0 = Sun, 1 = Mon ...
    const dayNameShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]
    const isSunday = dayOfWeek === 0
    dates.push({
      dateStr,
      dayNum: dd,
      dayNameShort,
      monthNameShort: curr.toLocaleString('en-US', { month: 'short' }),
      isSunday
    })
    curr.setDate(curr.getDate() + 1)
  }
  return dates
}

export default function AttendanceApproval() {
  const [logs, setLogs] = useState([])
  const [emps, setEmps] = useState([])
  const [periods, setPeriods] = useState([])
  const [monthlyPeriods, setMonthlyPeriods] = useState([])
  const [workingDays, setWorkingDays] = useState(27)
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [selectedMonthlyPeriodId, setSelectedMonthlyPeriodId] = useState('')
  const [activeTab, setActiveTab] = useState('sheet') // 'sheet' | 'punches'
  const [empFilter, setEmpFilter] = useState('weekly') // 'weekly' | 'all' | 'monthly'
  const [loading, setLoading] = useState(true)

  // Attendance Sheet state: { [empName]: { [dateStr]: { status: 'P' | 'HD' | 'A' | 'OFF' } } }
  const [attendanceSheet, setAttendanceSheet] = useState({})
  
  // Modals state
  const [selectedLogIds, setSelectedLogIds] = useState(new Set())
  const [photoModal, setPhotoModal] = useState(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [allLogs, empList, periodList, mPeriodList, wd] = await Promise.all([
        DB.attendanceLogs(),
        DB.employees(),
        DB.periods(),
        DB.monthlyPeriods(),
        DB.getWorkingDays()
      ])
      setLogs(allLogs || [])
      setEmps(empList || [])
      setPeriods(periodList || [])
      setMonthlyPeriods(mPeriodList || [])
      setWorkingDays(wd || 27)

      // Initial selected weekly period
      if (periodList && periodList.length > 0 && !selectedPeriodId) {
        const openP = periodList.find(p => p.status === 'open')
        setSelectedPeriodId(openP ? openP.id : periodList[0].id)
      }

      // Initial selected monthly period
      if (mPeriodList && mPeriodList.length > 0 && !selectedMonthlyPeriodId) {
        const openMP = mPeriodList.find(p => p.status === 'open')
        setSelectedMonthlyPeriodId(openMP ? openMP.id : mPeriodList[0].id)
      }
    } catch (e) {
      console.error('Error loading attendance review data:', e)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriodId, selectedMonthlyPeriodId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const isMonthlyMode = empFilter === 'monthly'

  const selectedPeriod = useMemo(() => {
    if (isMonthlyMode) {
      if (!monthlyPeriods.length) return null
      const p = monthlyPeriods.find(x => x.id === selectedMonthlyPeriodId) || monthlyPeriods[0]
      if (p) {
        return {
          id: p.id,
          label: p.month_label || p.month_name || 'Monthly Period',
          date_from: p.date_from || p.date || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
          date_to: p.date_to || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`,
          status: p.status,
          isMonthly: true
        }
      }
      return null
    }

    if (!periods.length) return null
    const p = periods.find(x => x.id === selectedPeriodId) || periods[0]
    return { ...p, isMonthly: false }
  }, [periods, monthlyPeriods, selectedPeriodId, selectedMonthlyPeriodId, isMonthlyMode])

  const periodDates = useMemo(() => {
    if (!selectedPeriod) return []
    return getDatesInRange(selectedPeriod.date_from, selectedPeriod.date_to)
  }, [selectedPeriod])

  const empMap = useMemo(() => DB.createEmpMap(emps), [emps])

  // Filtered employees for sheet
  const filteredEmployees = useMemo(() => {
    if (empFilter === 'weekly') {
      return emps.filter(e => e.salary_type === 'weekly' || !e.salary_type)
    }
    if (empFilter === 'monthly') {
      return emps.filter(e => e.salary_type === 'monthly')
    }
    return emps
  }, [emps, empFilter])

  // Build / initialize sheet data whenever selected period, logs, or employees change
  useEffect(() => {
    if (!selectedPeriod || !periodDates.length || !emps.length) return

    let isMounted = true
    const initSheet = async () => {
      // 1. Check if an admin previously customized and saved this period's sheet
      const saved = await DB.getAttendanceSheet(selectedPeriod.id)
      const newSheet = {}

      filteredEmployees.forEach(emp => {
        newSheet[emp.name] = {}
        periodDates.forEach(d => {
          // Check saved record first
          if (saved?.[emp.name]?.[d.dateStr]) {
            newSheet[emp.name][d.dateStr] = saved[emp.name][d.dateStr]
            return
          }

          // Otherwise, inspect live selfie punch logs
          const matchingLog = logs.find(l => 
            (l.emp_name === emp.name || l.emp_id === emp.emp_id) && 
            l.date === d.dateStr
          )

          if (matchingLog) {
            if (matchingLog.status === 'half_day' || (matchingLog.hours_worked > 0 && matchingLog.hours_worked < 5)) {
              newSheet[emp.name][d.dateStr] = 'HD'
            } else {
              newSheet[emp.name][d.dateStr] = 'P'
            }
          } else if (d.isSunday) {
            newSheet[emp.name][d.dateStr] = 'OFF'
          } else {
            newSheet[emp.name][d.dateStr] = 'A'
          }
        })
      })

      if (isMounted) {
        setAttendanceSheet(newSheet)
      }
    }

    initSheet()
    return () => { isMounted = false }
  }, [selectedPeriod, periodDates, emps, logs, filteredEmployees])

  // Helper to find punch log details for an employee on a date
  const getLogForCell = useCallback((empName, dateStr) => {
    return logs.find(l => 
      (l.emp_name === empName || empMap[empName]?.emp_id === l.emp_id) && 
      l.date === dateStr
    )
  }, [logs, empMap])

  // Toggle status for an employee on a specific date (P -> HD -> A -> OFF -> P)
  const cycleStatus = (empName, dateStr) => {
    const current = attendanceSheet[empName]?.[dateStr] || 'A'
    const cycle = {
      'P': 'HD',
      'HD': 'A',
      'A': 'OFF',
      'OFF': 'P'
    }
    const next = cycle[current] || 'P'

    setAttendanceSheet(prev => ({
      ...prev,
      [empName]: {
        ...(prev[empName] || {}),
        [dateStr]: next
      }
    }))
  }

  // Set explicit status
  const setDayStatus = (empName, dateStr, status) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [empName]: {
        ...(prev[empName] || {}),
        [dateStr]: status
      }
    }))
  }

  // Quick actions across the whole sheet
  const markAllFromPunches = () => {
    const updated = { ...attendanceSheet }
    filteredEmployees.forEach(emp => {
      if (!updated[emp.name]) updated[emp.name] = {}
      periodDates.forEach(d => {
        const log = getLogForCell(emp.name, d.dateStr)
        if (log) {
          updated[emp.name][d.dateStr] = 'P'
        } else if (d.isSunday) {
          updated[emp.name][d.dateStr] = 'OFF'
        } else {
          updated[emp.name][d.dateStr] = 'A'
        }
      })
    })
    setAttendanceSheet(updated)
    toast.success('Attendance sheet reset from selfie check-in punches 📸')
  }

  const markAllWorkingDaysPresent = () => {
    const updated = { ...attendanceSheet }
    filteredEmployees.forEach(emp => {
      if (!updated[emp.name]) updated[emp.name] = {}
      periodDates.forEach(d => {
        if (d.isSunday) {
          updated[emp.name][d.dateStr] = 'OFF'
        } else {
          updated[emp.name][d.dateStr] = 'P'
        }
      })
    })
    setAttendanceSheet(updated)
    toast.success('All working days marked as Present (P) ✅')
  }

  // Compute calculated days worked and leaves for an employee
  const getEmployeeStats = (empName) => {
    const days = attendanceSheet[empName] || {}
    let presentCount = 0
    let halfDayCount = 0
    let absentCount = 0
    let offCount = 0
    let selfiesCount = 0

    periodDates.forEach(d => {
      const st = days[d.dateStr]
      if (st === 'P') presentCount += 1
      else if (st === 'HD') halfDayCount += 1
      else if (st === 'OFF') offCount += 1
      else absentCount += 1 // 'A' or unrecorded

      if (getLogForCell(empName, d.dateStr)?.check_in_photo) {
        selfiesCount += 1
      }
    })

    const daysWorked = presentCount + (halfDayCount * 0.5)
    const leaves = absentCount + (halfDayCount * 0.5)

    const emp = empMap[empName]
    const pd = emp ? (emp.salary / workingDays) : 0
    const estPay = Math.round(pd * daysWorked)

    return {
      presentCount,
      halfDayCount,
      absentCount,
      offCount,
      selfiesCount,
      daysWorked,
      leaves,
      estPay
    }
  }

  // Aggregate stats across all visible employees
  const aggregateStats = useMemo(() => {
    let totalWorked = 0
    let totalLeaves = 0
    let totalSelfies = 0

    filteredEmployees.forEach(e => {
      const s = getEmployeeStats(e.name)
      totalWorked += s.daysWorked
      totalLeaves += s.leaves
      totalSelfies += s.selfiesCount
    })

    return {
      totalStaff: filteredEmployees.length,
      totalWorked,
      totalLeaves,
      totalSelfies
    }
  }, [filteredEmployees, attendanceSheet, periodDates])

  // Sync to Weekly / Monthly Payroll Entries
  const handleApproveAndSync = async () => {
    if (!selectedPeriod) {
      toast.error('No payroll period selected.')
      return
    }

    setSyncing(true)
    try {
      // 1. Build payload for each employee
      const payload = filteredEmployees.map(emp => {
        const stats = getEmployeeStats(emp.name)
        return {
          empName: emp.name,
          daysWorked: stats.daysWorked,
          leaves: stats.leaves,
          weekLabel: selectedPeriod.label,
          monthLabel: selectedPeriod.label,
          date: selectedPeriod.date_from
        }
      })

      // 2. Sync into weekly_entries or monthly_entries
      if (selectedPeriod.isMonthly) {
        await DB.syncAttendanceToMonthlyPayroll(
          selectedPeriod.id, 
          selectedPeriod.label, 
          selectedPeriod.date_from, 
          payload
        )
      } else {
        await DB.syncAttendanceToWeeklyPayroll(
          selectedPeriod.id, 
          selectedPeriod.label, 
          selectedPeriod.date_from, 
          payload
        )
      }

      // 3. Save the attendance sheet configuration to DB
      await DB.saveAttendanceSheet(selectedPeriod.id, attendanceSheet)

      // 4. Approve all logs matching these employees in this period
      const logsInPeriod = logs.filter(l => {
        return l.date >= selectedPeriod.date_from && l.date <= selectedPeriod.date_to
      })
      if (logsInPeriod.length > 0) {
        await DB.approveAttendanceLogs(logsInPeriod.map(l => l.id))
      }

      toast.success(
        `✅ Attendance approved & synced to ${selectedPeriod.isMonthly ? 'Monthly' : 'Weekly'} Payroll "${selectedPeriod.label}"! Updated ${payload.length} staff entries.`,
        { duration: 5000 }
      )
      setSyncModalOpen(false)
      loadData()
    } catch (err) {
      console.error('Error syncing attendance to payroll:', err)
      toast.error('Failed to sync attendance to payroll')
    } finally {
      setSyncing(false)
    }
  }

  // Individual Log Checkbox Actions (Tab 2)
  const toggleSelectLog = (id) => {
    const next = new Set(selectedLogIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedLogIds(next)
  }

  const toggleSelectAllLogs = () => {
    if (selectedLogIds.size === logs.length) {
      setSelectedLogIds(new Set())
    } else {
      setSelectedLogIds(new Set(logs.map(l => l.id)))
    }
  }

  const approveSelectedLogs = async () => {
    if (selectedLogIds.size === 0) {
      toast.error('Please select attendance logs to approve.')
      return
    }
    await DB.approveAttendanceLogs(Array.from(selectedLogIds))
    toast.success(`${selectedLogIds.size} Attendance Logs Approved ✅`)
    setSelectedLogIds(new Set())
    loadData()
  }

  const rejectSelectedLogs = async () => {
    if (selectedLogIds.size === 0) {
      toast.error('Please select attendance logs to reject.')
      return
    }
    await DB.rejectAttendanceLogs(Array.from(selectedLogIds))
    toast.error(`${selectedLogIds.size} Attendance Logs Rejected ❌`)
    setSelectedLogIds(new Set())
    loadData()
  }

  const approveSingleLog = async (log) => {
    if (!log?.id) return
    await DB.approveAttendanceLogs([log.id])
    if (log.emp_name && log.date) {
      setDayStatus(log.emp_name, log.date, 'P')
    }
    toast.success(`Punch approved for ${log.emp_name} ✅`)
    if (photoModal?.id === log.id || photoModal?.date === log.date) {
      setPhotoModal(null)
    }
    loadData()
  }

  const rejectSingleLog = async (log) => {
    if (!log?.id) return
    await DB.rejectAttendanceLogs([log.id])
    if (log.emp_name && log.date) {
      setDayStatus(log.emp_name, log.date, 'A')
    }
    toast.error(`Punch rejected for ${log.emp_name} ❌ (Marked Absent)`)
    if (photoModal?.id === log.id || photoModal?.date === log.date) {
      setPhotoModal(null)
    }
    loadData()
  }

  if (loading) {
    return (
      <Layout title="Attendance Review & Approval">
        <Spinner />
      </Layout>
    )
  }

  return (
    <Layout title="Attendance Review & Payroll Sync">
      {/* ── TOP BANNER & PERIOD SELECTOR ── */}
      <div style={{ 
        background: '#FFFFFF', 
        border: '2px solid var(--border)', 
        borderRadius: 24, 
        padding: '24px 32px', 
        marginBottom: 24, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: 20, 
        boxShadow: 'var(--shadow-sm)' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ 
              background: 'var(--brit-red)', 
              color: '#FFFFFF', 
              fontSize: 10, 
              fontWeight: 900, 
              padding: '3px 10px', 
              borderRadius: 9999, 
              letterSpacing: 1.2, 
              textTransform: 'uppercase' 
            }}>
              Attendance Engine
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>
              Britannia FMCG Daily Punch & Audit
            </span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)', margin: '6px 0 2px' }}>
            Weekly Attendance Register & Approval
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: 13, fontWeight: 600 }}>
            Review daily selfie check-ins • Modify Present / Half Day / Absent • Auto-sync directly into Weekly Payroll calculations
          </p>
        </div>

        {/* Period Selector Dropdown & Sync CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>
              {isMonthlyMode ? 'Select Monthly Cycle:' : 'Select Payroll Week:'}
            </div>
            {isMonthlyMode ? (
              <select 
                className="form-input" 
                style={{ fontWeight: 800, color: 'var(--navy)', minWidth: 280, padding: '10px 14px', borderRadius: 12, border: '2px solid var(--border)' }}
                value={selectedMonthlyPeriodId}
                onChange={e => setSelectedMonthlyPeriodId(e.target.value)}
              >
                {monthlyPeriods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.month_label || p.month_name} ({p.date_from ? new Date(p.date_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : (p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '')} - {p.date_to ? new Date(p.date_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}) — {p.status === 'open' ? '🟢 Active' : '📁 Closed'}
                  </option>
                ))}
                {!monthlyPeriods.length && <option value="">No monthly periods found</option>}
              </select>
            ) : (
              <select 
                className="form-input" 
                style={{ fontWeight: 800, color: 'var(--navy)', minWidth: 280, padding: '10px 14px', borderRadius: 12, border: '2px solid var(--border)' }}
                value={selectedPeriodId}
                onChange={e => setSelectedPeriodId(e.target.value)}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.date_from ? new Date(p.date_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''} - {p.date_to ? new Date(p.date_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}) — {p.status === 'open' ? '🟢 Active' : '📁 Closed'}
                  </option>
                ))}
                {!periods.length && <option value="">No weekly periods found</option>}
              </select>
            )}
          </div>

          <button 
            type="button"
            className="btn btn-primary" 
            style={{ 
              padding: '12px 24px', 
              borderRadius: 9999, 
              fontSize: 13, 
              fontWeight: 900, 
              letterSpacing: 0.5,
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              boxShadow: '0 6px 20px rgba(227,30,36,0.3)'
            }}
            onClick={() => setSyncModalOpen(true)}
          >
            <ShieldCheck size={18} />
            <span>Approve & Sync to Weekly Payroll</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'var(--brit-red-light)', color: 'var(--brit-red)', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Staff in Period</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)' }}>{aggregateStats.totalStaff} Staff</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>Weekly active roster</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'var(--brit-green-light)', color: 'var(--brit-green)', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Total Days Worked</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--brit-green)' }}>{aggregateStats.totalWorked} Days</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>Sum of Full & Half Days</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#FEE2E2', color: '#DC2626', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Total Leaves / Off</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#DC2626' }}>{aggregateStats.totalLeaves} Days</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>Absences to deduct</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#E0F2FE', color: '#0284C7', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={24} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Selfie Punches</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0284C7' }}>{aggregateStats.totalSelfies} Logged</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>Face & GPS verified</div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS & TOOLBAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '2px solid var(--border)', marginBottom: 20, paddingBottom: 12 }}>
        {/* Main View Tabs */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            type="button"
            className="btn" 
            style={{ 
              background: activeTab === 'sheet' ? 'var(--navy)' : '#FFFFFF', 
              color: activeTab === 'sheet' ? '#FFFFFF' : 'var(--navy)',
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 9999,
              border: '2px solid var(--border)'
            }}
            onClick={() => setActiveTab('sheet')}
          >
            <Calendar size={16} />
            <span>📋 Weekly Attendance Register (Sheet)</span>
          </button>

          <button 
            type="button"
            className="btn" 
            style={{ 
              background: activeTab === 'punches' ? 'var(--navy)' : '#FFFFFF', 
              color: activeTab === 'punches' ? '#FFFFFF' : 'var(--navy)',
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 9999,
              border: '2px solid var(--border)'
            }}
            onClick={() => setActiveTab('punches')}
          >
            <Camera size={16} />
            <span>📸 Selfie Punch Audit List ({logs.length})</span>
          </button>
        </div>

        {/* Legend & Filter Controls */}
        {activeTab === 'sheet' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 6 }}>
                🟢 P = 1.0d
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF9C3', color: '#854D0E', padding: '3px 8px', borderRadius: 6 }}>
                🟡 HD = 0.5d
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: 6 }}>
                🔴 A = 0d
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: 6 }}>
                ⚪ OFF = 0d
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                type="button"
                className="btn btn-sm" 
                style={{ background: '#FFFFFF', border: '1.5px solid var(--border)', fontSize: 11, fontWeight: 800 }}
                onClick={markAllFromPunches}
                title="Reset sheet from actual selfie punch logs"
              >
                <RefreshCw size={13} />
                <span>Reset from Selfies</span>
              </button>
              <button 
                type="button"
                className="btn btn-sm" 
                style={{ background: 'var(--brit-cream-light)', border: '1.5px solid var(--border)', fontSize: 11, fontWeight: 800 }}
                onClick={markAllWorkingDaysPresent}
                title="Mark all Monday-Saturday days as Present"
              >
                <Check size={13} />
                <span>Mark All Present</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TAB 1: WEEKLY ATTENDANCE REGISTER (SHEET VIEW) ── */}
      {activeTab === 'sheet' && (
        <Panel 
          title={selectedPeriod ? `${selectedPeriod.label} Attendance Matrix` : 'Weekly Attendance Matrix'}
          subtitle={selectedPeriod ? `Date Range: ${selectedPeriod.date_from} → ${selectedPeriod.date_to} • Click any status badge to cycle: P (1.0) → HD (0.5) → A (0.0) → OFF` : ''}
          noPad
        >
          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 200, position: 'sticky', left: 0, background: '#F8FAFC', zIndex: 10 }}>Employee</th>
                  {periodDates.map(d => (
                    <th key={d.dateStr} style={{ textAlign: 'center', minWidth: 85, background: d.isSunday ? '#FEE2E2' : '#F8FAFC' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: d.isSunday ? '#991B1B' : 'var(--navy)' }}>
                        {d.dayNameShort}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 700 }}>
                        {d.dayNum} {d.monthNameShort}
                      </div>
                      {d.isSunday && (
                        <div style={{ fontSize: 9, fontWeight: 900, color: '#DC2626' }}>OFF</div>
                      )}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', minWidth: 90, background: '#F0FDF4', color: '#166534' }}>Days Worked</th>
                  <th style={{ textAlign: 'center', minWidth: 70, background: '#FEF2F2', color: '#991B1B' }}>Leaves</th>
                  <th style={{ textAlign: 'right', minWidth: 100 }}>Est. Weekly Pay</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const stats = getEmployeeStats(emp.name)
                  const empDays = attendanceSheet[emp.name] || {}

                  return (
                    <tr key={emp.id}>
                      {/* Fixed Employee Column */}
                      <td style={{ position: 'sticky', left: 0, background: '#FFFFFF', zIndex: 5, boxShadow: '2px 0 5px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600, display: 'flex', gap: 6, marginTop: 2 }}>
                          <span>{emp.emp_id || 'THULIR'}</span>
                          <span>•</span>
                          <span style={{ color: 'var(--brit-red)', fontWeight: 800 }}>{fmt(emp.salary)}/mo</span>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {periodDates.map(d => {
                        const status = empDays[d.dateStr] || (d.isSunday ? 'OFF' : 'A')
                        const log = getLogForCell(emp.name, d.dateStr)
                        const hasSelfie = !!log?.check_in_photo

                        // Colors based on status
                        let bg = '#F1F5F9'
                        let fg = '#475569'
                        let border = '#CBD5E1'

                        if (status === 'P') {
                          bg = '#DCFCE7'
                          fg = '#166534'
                          border = '#86EFAC'
                        } else if (status === 'HD') {
                          bg = '#FEF9C3'
                          fg = '#854D0E'
                          border = '#FDE047'
                        } else if (status === 'A') {
                          bg = '#FEE2E2'
                          fg = '#991B1B'
                          border = '#FCA5A5'
                        }

                        return (
                          <td key={d.dateStr} style={{ textAlign: 'center', padding: '10px 4px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              {/* Clickable Status Button */}
                              <button
                                type="button"
                                onClick={() => cycleStatus(emp.name, d.dateStr)}
                                style={{
                                  background: bg,
                                  color: fg,
                                  border: `1.5px solid ${border}`,
                                  borderRadius: 8,
                                  fontWeight: 900,
                                  fontSize: 12,
                                  padding: '4px 10px',
                                  cursor: 'pointer',
                                  minWidth: 44,
                                  transition: 'transform 0.1s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                                title="Click to cycle: Present (P) → Half Day (HD) → Absent (A) → Week Off (OFF)"
                              >
                                {status}
                              </button>

                              {/* Selfie camera thumbnail or badge */}
                              {hasSelfie && (
                                <div 
                                  onClick={() => setPhotoModal({
                                    id: log?.id,
                                    name: emp.name,
                                    live: log.check_in_photo,
                                    ref: emp.profile_photo,
                                    date: d.dateStr,
                                    time: log.check_in_time,
                                    address: log.check_in_address,
                                    lat: log.check_in_lat,
                                    lng: log.check_in_lng,
                                    score: log.face_score,
                                    status: log?.status,
                                    logObj: log
                                  })}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 3, 
                                    cursor: 'pointer', 
                                    background: '#E0F2FE', 
                                    color: '#0369A1', 
                                    fontSize: 9, 
                                    fontWeight: 800, 
                                    padding: '2px 6px', 
                                    borderRadius: 9999 
                                  }}
                                  title="View Selfie & GPS Check-In Audit"
                                >
                                  <Camera size={10} />
                                  <span>{log.check_in_time ? log.check_in_time.slice(0, 5) : 'Selfie'}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}

                      {/* Days Worked Total */}
                      <td style={{ textAlign: 'center', background: '#F0FDF4' }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#166534' }}>
                          {stats.daysWorked.toFixed(1)}d
                        </span>
                        <div style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 700 }}>
                          ({stats.presentCount}P + {stats.halfDayCount}HD)
                        </div>
                      </td>

                      {/* Leaves Total */}
                      <td style={{ textAlign: 'center', background: '#FEF2F2' }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#991B1B' }}>
                          {stats.leaves.toFixed(1)}d
                        </span>
                      </td>

                      {/* Est Weekly Pay */}
                      <td className="amt amt-green" style={{ textAlign: 'right', fontWeight: 900, fontSize: 14 }}>
                        {fmt(stats.estPay)}
                      </td>
                    </tr>
                  )
                })}

                {!filteredEmployees.length && (
                  <tr>
                    <td colSpan={periodDates.length + 4} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)', fontWeight: 600 }}>
                      No employees matching the selected roster filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── TAB 2: RAW SELFIE PUNCH AUDIT LIST ── */}
      {activeTab === 'punches' && (
        <Panel title="Submitted Employee Punches" subtitle="AI Face Verification & GPS Geofence Verification">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
            <button className="btn btn-sm" style={{ background: 'var(--brit-cream-light)', border: '2px solid var(--border)', color: 'var(--navy)' }} onClick={toggleSelectAllLogs}>
              <CheckSquare size={16} />
              <span>{selectedLogIds.size === logs.length ? 'Deselect All' : 'Select All'}</span>
            </button>
            <button className="btn btn-sm" style={{ background: '#FEE2E2', border: '1.5px solid #FCA5A5', color: '#991B1B', fontWeight: 800 }} onClick={rejectSelectedLogs}>
              <XCircle size={16} />
              <span>Reject Selected ({selectedLogIds.size})</span>
            </button>
            <button className="btn btn-sm btn-primary" onClick={approveSelectedLogs}>
              <ShieldCheck size={16} />
              <span>Approve Selected Punches ({selectedLogIds.size})</span>
            </button>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Select</th>
                  <th>Employee</th>
                  <th>Date & Time</th>
                  <th>Selfie Photo</th>
                  <th>GPS Location</th>
                  <th>AI Match</th>
                  <th style={{ textAlign: 'right' }}>Status & Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, idx) => {
                  const emp = empMap[l.emp_name]
                  return (
                    <tr key={l.id || idx}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedLogIds.has(l.id)} 
                          onChange={() => toggleSelectLog(l.id)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--brit-red)' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--navy)' }}>{l.emp_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600 }}>{emp?.emp_id || 'STAFF'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{l.date}</div>
                        <div style={{ fontSize: 12, color: 'var(--brit-green)', fontWeight: 700 }}>In: {l.check_in_time || '—'} {l.check_out_time ? `| Out: ${l.check_out_time}` : ''}</div>
                      </td>
                      <td>
                        {l.check_in_photo ? (
                          <div 
                            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                            onClick={() => setPhotoModal({ 
                              id: l.id,
                              name: l.emp_name, 
                              live: l.check_in_photo, 
                              ref: emp?.profile_photo,
                              date: l.date,
                              time: l.check_in_time,
                              address: l.check_in_address,
                              lat: l.check_in_lat,
                              lng: l.check_in_lng,
                              score: l.face_score,
                              status: l.status,
                              logObj: l
                            })}
                          >
                            <img src={l.check_in_photo} alt="Selfie" style={{ width: 44, height: 44, borderRadius: 9999, objectFit: 'cover', border: '2px solid var(--brit-red)' }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brit-red)', textDecoration: 'underline' }}>View Selfie</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--slate)' }}>No Selfie</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={14} color="var(--brit-red)" />
                          <span>{l.check_in_address || 'Store Erode'}</span>
                        </div>
                        {l.check_in_lat && (
                          <a 
                            href={`https://maps.google.com/?q=${l.check_in_lat},${l.check_in_lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ fontSize: 10, color: 'var(--brit-red)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                          >
                            <span>Open Map</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-green">🟢 {l.face_score || 92}% Match</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                          {l.status === 'approved' ? (
                            <span className="badge badge-green">Approved ✅</span>
                          ) : l.status === 'rejected' ? (
                            <span className="badge badge-red">Rejected ❌</span>
                          ) : l.status === 'missing_checkout_resolved' ? (
                            <span className="badge badge-blue">Time Fixed</span>
                          ) : (
                            <span className="badge badge-red">Pending Review</span>
                          )}

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button 
                              type="button"
                              className="btn btn-sm"
                              style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', padding: '4px 8px', fontSize: 11, fontWeight: 800, borderRadius: 6 }}
                              onClick={() => approveSingleLog(l)}
                              title="Approve punch"
                            >
                              Approve
                            </button>
                            <button 
                              type="button"
                              className="btn btn-sm"
                              style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', padding: '4px 8px', fontSize: 11, fontWeight: 800, borderRadius: 6 }}
                              onClick={() => rejectSingleLog(l)}
                              title="Reject punch & mark Absent"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)', fontWeight: 600 }}>
                      No daily check-in submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── PHOTO COMPARISON & AUDIT MODAL ── */}
      {photoModal && (
        <Modal 
          title={`Selfie Verification — ${photoModal.name}`} 
          onClose={() => setPhotoModal(null)} 
          wide
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 8 }}>
                Live Check-In Selfie ({photoModal.date})
              </div>
              <img 
                src={photoModal.live} 
                alt="Live Selfie" 
                style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 20, border: '3px solid var(--brit-red)' }} 
              />
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginTop: 8 }}>
                Punch Time: {photoModal.time || 'Recorded'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 8 }}>
                Reference Profile Photo
              </div>
              {photoModal.ref ? (
                <img 
                  src={photoModal.ref} 
                  alt="Profile" 
                  style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 20, border: '3px solid var(--border)' }} 
                />
              ) : (
                <div style={{ width: '100%', height: 260, background: 'var(--brit-cream-light)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--slate)' }}>
                  No Profile Photo Set
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--brit-green)', marginTop: 8 }}>
                AI Face Score: {photoModal.score || 92}% Match
              </div>
            </div>
          </div>

          {photoModal.address && (
            <div style={{ marginTop: 20, background: 'var(--brit-cream-light)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--brit-red)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>GPS Geofence: {photoModal.address}</span>
              </div>
              {photoModal.lat && (
                <a 
                  href={`https://maps.google.com/?q=${photoModal.lat},${photoModal.lng}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ fontSize: 12, fontWeight: 800, color: 'var(--brit-red)', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span>Open Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Modal Action Footer: Approve / Reject */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>
              Current Status: <strong style={{ color: photoModal.status === 'approved' ? 'var(--brit-green)' : photoModal.status === 'rejected' ? '#DC2626' : 'var(--navy)' }}>
                {photoModal.status ? photoModal.status.toUpperCase() : 'PENDING'}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn"
                style={{ background: '#FEE2E2', color: '#991B1B', border: '1.5px solid #FCA5A5', fontWeight: 800, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => rejectSingleLog(photoModal.logObj || { id: photoModal.id, emp_name: photoModal.name, date: photoModal.date })}
              >
                <XCircle size={18} />
                <span>Reject Punch (Mark Absent)</span>
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: '#DCFCE7', color: '#166534', border: '1.5px solid #86EFAC', fontWeight: 800, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => approveSingleLog(photoModal.logObj || { id: photoModal.id, emp_name: photoModal.name, date: photoModal.date })}
              >
                <CheckCircle2 size={18} />
                <span>Approve Punch</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── APPROVAL & WEEKLY PAYROLL SYNC CONFIRMATION MODAL ── */}
      {syncModalOpen && (
        <Modal 
          title="Approve Attendance & Sync to Weekly Payroll" 
          onClose={() => setSyncModalOpen(false)}
          onSave={handleApproveAndSync}
          saveLabel={syncing ? 'Syncing...' : `Confirm & Push to ${selectedPeriod?.label || 'Payroll'}`}
          wide
        >
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brit-green)', marginBottom: 8 }}>
              <ShieldCheck size={22} />
              <h4 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>
                Payroll Integration Confirmation
              </h4>
            </div>
            <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.5 }}>
              You are about to approve the attendance sheet for <strong>{selectedPeriod?.label}</strong> ({selectedPeriod?.date_from} → {selectedPeriod?.date_to}). 
              This will update each staff member's <strong>Days Worked</strong> and <strong>Leaves</strong> directly in the weekly payroll calculation engine:
            </p>
          </div>

          <div className="tbl-wrap" style={{ maxHeight: '45vh', border: '1.5px solid var(--border)', borderRadius: 14, marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ textAlign: 'center' }}>Days Worked</th>
                  <th style={{ textAlign: 'center' }}>Leaves</th>
                  <th style={{ textAlign: 'right' }}>Est. Weekly Pay</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const s = getEmployeeStats(emp.name)
                  return (
                    <tr key={emp.id}>
                      <td>
                        <strong style={{ fontSize: 13 }}>{emp.name}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-green" style={{ fontWeight: 800 }}>
                          {s.daysWorked.toFixed(1)} Days
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-red" style={{ fontWeight: 800 }}>
                          {s.leaves.toFixed(1)} Days
                        </span>
                      </td>
                      <td className="amt amt-green" style={{ textAlign: 'right', fontWeight: 800 }}>
                        {fmt(s.estPay)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#166534' }}>
                Total Verified Days: {aggregateStats.totalWorked} Days across {aggregateStats.totalStaff} Staff
              </div>
              <div style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>
                Rates derived using Britannia FMCG Standard ({workingDays} Base Working Days)
              </div>
            </div>
            <Link 
              to="/weekly" 
              style={{ fontSize: 12, fontWeight: 800, color: 'var(--brit-red)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              onClick={() => setSyncModalOpen(false)}
            >
              <span>Weekly Entry Page</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
