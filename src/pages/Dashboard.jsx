import { useState, useEffect, useMemo } from 'react'
import { DB, fmt } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Spinner } from '../components/UI'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Users, Wallet, AlertCircle, Banknote, 
  ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle2 
} from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedFY, setSelectedFY] = useState(() => {
    const now = new Date()
    const year = now.getMonth() + 1 <= 3 ? now.getFullYear() - 1 : now.getFullYear()
    return `${year}-${String(year + 1).slice(2)}`
  })
  const navigate = useNavigate()

  const getFY = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    const year = d.getMonth() + 1 <= 3 ? d.getFullYear() - 1 : d.getFullYear()
    return `${year}-${String(year + 1).slice(2)}`
  }

  useEffect(() => {
    Promise.all([
      DB.employees(), DB.weekly(), DB.advances(), DB.shortages(), DB.getWorkingDays(), DB.openPeriod(), DB.periods()
    ]).then(([emps, weekly, advances, shortages, wd, openP, allPeriods]) => {
      setData({ emps, weekly, advances, shortages, wd, openP, allPeriods })
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const { emps, weekly, advances, shortages, wd, openP, allPeriods } = data
    const periodMap = {}
    allPeriods.forEach(p => periodMap[p.id] = p)
    
    // 1. Map-based lookups for O(N) efficiency
    const empMap = DB.createEmpMap(emps)
    
    // 2. Filter data by FY
    const fyWeekly = weekly.filter(w => {
      const p = periodMap[w.period_id]
      return p && getFY(p.date_from) === selectedFY
    })
    const fyAdvances = advances.filter(a => getFY(a.date) === selectedFY)
    const fyShortages = shortages.filter(s => getFY(s.date) === selectedFY)

    // 3. Efficient calculations
    let totalWeeklyPay = 0
    let totalAdv = 0
    let totalShr = 0
    
    fyWeekly.forEach(w => {
      const emp = empMap[w.name]
      totalWeeklyPay += DB.weekSalary(w, emp, wd)
    })
    
    fyAdvances.forEach(a => totalAdv += Number(a.amount || 0))
    fyShortages.forEach(s => totalShr += Number(s.amount || 0))
    
    const latestWeekly = fyWeekly.slice(0, 8)
    const activeEmps = emps.length
    const weeklyEmps = emps.filter(e => e.salary_type === 'weekly' || !e.salary_type).length
    
    let processedCount = 0
    if (openP && getFY(openP.date_from) === selectedFY) {
      processedCount = weekly.filter(w => w.period_id === openP.id).length
    }
    
    // Get all available FYs
    const fys = new Set()
    allPeriods.forEach(p => { const fy = getFY(p.date_from); if (fy) fys.add(fy) })
    advances.forEach(a => { const fy = getFY(a.date); if (fy) fys.add(fy) })
    if (fys.size === 0) fys.add(selectedFY)
    
    return { totalWeeklyPay, totalAdv, totalShr, latestWeekly, activeEmps, empMap, wd, openP, processedCount, weeklyEmps, availableFYs: Array.from(fys).sort().reverse() }
  }, [data, selectedFY])

  if (loading) return <Layout title="Dashboard"><Spinner /></Layout>

  const { totalWeeklyPay, totalAdv, totalShr, latestWeekly, activeEmps, empMap, wd, openP, processedCount, weeklyEmps, availableFYs } = stats

  return (
    <Layout title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>Payroll Overview</span>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Financial Year</span>
          <select 
            value={selectedFY} 
            onChange={e => setSelectedFY(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
          >
            {availableFYs.map(fy => <option key={fy} value={fy} style={{ color: '#000' }}>FY {fy}</option>)}
          </select>
        </div>
      </div>
    }>
      <div className="kpi-grid">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ color: 'var(--blue)' }}><Users /></div>
            <div className="kpi-label">Employees</div>
            <div className="kpi-value">{activeEmps}</div>
            <div className="kpi-sub">Active staff members</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="kpi-card green">
            <div className="kpi-icon" style={{ color: 'var(--emerald)' }}><Banknote /></div>
            <div className="kpi-label">Weekly Payroll</div>
            <div className="kpi-value">{fmt(totalWeeklyPay)}</div>
            <div className="kpi-sub">Total payouts recorded</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="kpi-card red">
            <div className="kpi-icon" style={{ color: 'var(--rose)' }}><Wallet /></div>
            <div className="kpi-label">Outstanding Advances</div>
            <div className="kpi-value">{fmt(totalAdv)}</div>
            <div className="kpi-sub">Pending staff recoveries</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="kpi-card orange">
            <div className="kpi-icon" style={{ color: 'var(--amber)' }}><AlertCircle /></div>
            <div className="kpi-label">Stock Shortages</div>
            <div className="kpi-value">{fmt(totalShr)}</div>
            <div className="kpi-sub">Reported mismatch value</div>
          </div>
        </motion.div>
      </div>

      <div className="dashboard-main-grid">
        <Panel title="Latest Weekly Activity" subtitle="Real-time payroll tracking">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Week Period</th>
                  <th style={{ textAlign: 'center' }}>Days</th>
                  <th>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {latestWeekly.map((w, idx) => {
                  const emp = empMap[w.name]
                  const salary = DB.weekSalary(w, emp, wd)
                  const ded = Number(w.adv_deducted || 0) + Number(w.shr_deducted || 0)
                  return (
                    <motion.tr 
                      key={w.id} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: 0.1 * idx }}
                    >
                      <td>
                        <div style={{ fontWeight: 700 }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'capitalize' }}>{emp?.salary_type || 'Weekly'} staff</div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{w.week_label}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-blue">{w.days_worked} d</span>
                      </td>
                      <td className="amt-red">-{fmt(ded)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="amt-green" style={{ fontWeight: 800 }}>{fmt(salary)}</div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Panel title="System Status" headerColor="var(--indigo)">
            <div style={{ padding: '8px 0' }}>
              {[
                { label: 'Database', status: 'Healthy', color: 'var(--emerald)' },
                { label: 'Cloud Storage', status: 'Active', color: 'var(--emerald)' },
                { label: 'Auth Engine', status: 'Verified', color: 'var(--indigo)' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)' }}>{item.label}</span>
                  <span className="badge" style={{ background: `${item.color}15`, color: item.color }}>{item.status}</span>
                </div>
              ))}
            </div>
          </Panel>
          
          <div style={{ background: '#222', borderRadius: '24px', padding: 32, color: '#fff', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <TrendingUp style={{ position: 'absolute', right: -20, bottom: -20, size: 120, opacity: 0.05 }} />
            <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>{openP ? openP.label : 'Current Period'}</div>
            <div style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px', color: '#fff' }}>Weekly Audit</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 24px' }}>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(processedCount/weeklyEmps)*100}%` }}
                  style={{ height: '100%', background: 'var(--blue)' }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{processedCount}/{weeklyEmps}</span>
            </div>

            <p style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.6, marginBottom: 24 }}>
              {openP ? `Currently processing attendance for ${openP.label}.` : 'No active payroll week found. Start a new period to track audit.'}
            </p>
            <button className="btn btn-blue" style={{ width: '100%', justifyContent: 'center', height: 48 }} onClick={() => navigate('/weekly')}>
              {openP ? 'Complete Processing' : 'View Full Reports'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
