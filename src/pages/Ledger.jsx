import { useState, useEffect, useMemo } from 'react'
import { DB, fmt, fmtDate } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Spinner } from '../components/UI'
import { motion } from 'framer-motion'
import { 
  History, Wallet, TrendingDown, 
  Search, User, CreditCard, ArrowUpRight, AlertTriangle 
} from 'lucide-react'

export default function Ledger() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ emps: [], weekly: [], monthly: [], advances: [], shortages: [], wd: 26 })
  const [selEmp, setSelEmp] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [e, w, m, a, s, wdays] = await Promise.all([
          DB.employees(), DB.weekly(), DB.monthlyAll().catch(() => []), DB.advances(), DB.shortages(), DB.getWorkingDays()
        ])
        setData({ emps: e, weekly: w, monthly: m, advances: a, shortages: s, wd: wdays })
        if (e.length) setSelEmp(e[0].name)
      } catch (err) {
        console.error('Ledger load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    if (!selEmp || loading) return null
    const { emps, weekly, monthly, advances, shortages, wd } = data
    const emp = emps.find(e => e.name === selEmp)
    if (!emp) return null

    const myWeekly  = weekly.filter(w => w.name === selEmp)
    const myMonthly = monthly.filter(m => m.name === selEmp)
    const myAdv     = advances.filter(a => a.name === selEmp)
    const myShr     = shortages.filter(s => s.name === selEmp)

    const totalAdvGiven = myAdv.reduce((s, a) => s + Number(a.amount), 0)
    const totalShrGiven = myShr.reduce((s, a) => s + Number(a.amount), 0)
    
    const totalAdvDed = [...myWeekly, ...myMonthly].reduce((s, x) => s + Number(x.adv_deducted || 0), 0)
    const totalShrDed = [...myWeekly, ...myMonthly].reduce((s, x) => s + Number(x.shr_deducted || 0), 0)

    const history = [
      ...myWeekly.map(w => ({ type: 'Weekly Salary', date: w.date, label: w.week_label, amt: DB.weekSalary(w, emp, wd), days: w.days_worked, leaves: w.leaves, adv: w.adv_deducted, shr: w.shr_deducted })),
      ...myMonthly.map(m => ({ type: 'Monthly Salary', date: m.date, label: m.month_label, amt: DB.monthlySalary(m, emp, wd), days: m.days_worked, leaves: m.leaves, adv: m.adv_deducted, shr: m.shr_deducted })),
      ...myAdv.map(a => ({ type: 'Advance Given', date: a.date, label: 'Advance', amt: a.amount, isPayment: false, remarks: a.remarks })),
      ...myShr.map(s => ({ type: 'Shortage Given', date: s.date, label: 'Shortage', amt: s.amount, isPayment: false, remarks: s.remarks }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    return { emp, totalAdvGiven, totalShrGiven, totalAdvDed, totalShrDed, history }
  }, [selEmp, data, loading])

  if (loading) return <Layout title="Employee Ledger"><Spinner /></Layout>

  return (
    <Layout title="Staff Financial Ledger">
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32, alignItems: 'start' }}>
        
        {/* Sidebar Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Panel title="Profile Selection">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginLeft: 4 }}>Select Staff Member</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', opacity: 0.4 }} />
                <select 
                  className="form-input"
                  value={selEmp} 
                  onChange={e => setSelEmp(e.target.value)}
                  style={{ paddingLeft: 48 }}
                >
                  {data.emps.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
            </div>

            {stats && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 24, padding: 24, background: 'linear-gradient(135deg, var(--navy), var(--slate))', borderRadius: 20, color: '#fff' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 4 }}>Contracted Salary</div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>{fmt(stats.emp.salary)}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{stats.emp.salary_type === 'monthly' ? '🗓️ Monthly' : '📅 Weekly'} Payout</div>
              </motion.div>
            )}
          </Panel>

          {stats && (
            <div style={{ background: 'var(--white)', borderRadius: 24, padding: '24px', boxShadow: 'var(--shadow-premium)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={18} color="var(--blue)" /> Payment Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Adv. Deducted', val: stats.totalAdvDed, color: 'var(--emerald)' },
                  { label: 'Shr. Deducted', val: stats.totalShrDed, color: 'var(--amber)' },
                  { label: 'Net Transactions', val: stats.history.length, color: 'var(--indigo)' }
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{typeof item.val === 'number' && item.label.includes('Deducted') ? fmt(item.val) : item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Ledger Content */}
        {stats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon" style={{ color: 'var(--blue)' }}><Wallet /></div>
                <div className="kpi-label">Total Advance</div>
                <div className="kpi-value">{fmt(stats.totalAdvGiven)}</div>
                <div className="kpi-sub">Life-time disbursements</div>
              </div>
              <div className="kpi-card green">
                <div className="kpi-icon" style={{ color: 'var(--emerald)' }}><ArrowUpRight /></div>
                <div className="kpi-label">Recovered</div>
                <div className="kpi-value">{fmt(stats.totalAdvDed)}</div>
                <div className="kpi-sub">Successful deductions</div>
              </div>
              <div className="kpi-card red">
                <div className="kpi-icon" style={{ color: 'var(--rose)' }}><TrendingDown /></div>
                <div className="kpi-label">Pending Recovery</div>
                <div className="kpi-value">{fmt(stats.totalAdvGiven - stats.totalAdvDed)}</div>
                <div className="kpi-sub">Current staff liability</div>
              </div>
              <div className="kpi-card orange">
                <div className="kpi-icon" style={{ color: 'var(--amber)' }}><AlertTriangle /></div>
                <div className="kpi-label">Shortage Balance</div>
                <div className="kpi-value">{fmt(stats.totalShrGiven - stats.totalShrDed)}</div>
                <div className="kpi-sub">Stock mismatch value</div>
              </div>
            </div>

            <Panel title={`Transaction History: ${selEmp}`} subtitle="Comprehensive audit trail of all payments and deductions" noPad>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th style={{ textAlign: 'center' }}>Activity</th>
                      <th>Deductions</th>
                      <th style={{ textAlign: 'right' }}>Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.history.length ? stats.history.map((h, i) => (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600 }}>{fmtDate(h.date)}</td>
                        <td>
                          <span className={`badge ${h.type.includes('Salary') ? 'badge-blue' : 'badge-green'}`}>
                            {h.type}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{h.label}</div>
                          {h.remarks && <div style={{ fontSize: 11, color: 'var(--slate)', opacity: 0.6 }}>{h.remarks}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {h.days !== undefined ? (
                            <span className="badge badge-blue" style={{ fontSize: 11 }}>{h.days}d / {h.leaves}l</span>
                          ) : <span style={{ opacity: 0.2 }}>—</span>}
                        </td>
                        <td>
                          {h.adv !== undefined && (h.adv > 0 || h.shr > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {h.adv > 0 && <div className="amt-red" style={{ fontSize: 11 }}>Adv: -{fmt(h.adv)}</div>}
                              {h.shr > 0 && <div className="amt-red" style={{ fontSize: 11 }}>Shr: -{fmt(h.shr)}</div>}
                            </div>
                          ) : <span style={{ opacity: 0.2 }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={h.type.includes('Salary') ? 'amt-green' : 'amt-blue'} style={{ fontWeight: 800, fontSize: 15 }}>
                            {fmt(h.amt)}
                          </div>
                        </td>
                      </motion.tr>
                    )) : (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 80 }}>
                        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>📜</div>
                        <p style={{ color: 'var(--slate)', opacity: 0.5, fontWeight: 600 }}>No transaction history found for this staff member</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        ) : (
          <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', borderRadius: 24, border: '2px dashed var(--border)' }}>
            <p style={{ color: 'var(--slate)', opacity: 0.5, fontWeight: 600 }}>Select an employee from the sidebar to view their full financial ledger</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
