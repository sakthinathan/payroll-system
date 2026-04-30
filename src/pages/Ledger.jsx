import { useState, useEffect, useMemo } from 'react'
import { DB, fmt, fmtDate } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Spinner, KpiCard } from '../components/UI'

export default function Ledger() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ emps: [], weekly: [], monthly: [], advances: [], shortages: [], wd: 26 })
  const [selEmp, setSelEmp] = useState('')

  useEffect(() => {
    async function load() {
      const [e, w, m, a, s, wdays] = await Promise.all([
        DB.employees(), DB.weekly(), DB.monthlyAll(), DB.advances(), DB.shortages(), DB.getWorkingDays()
      ])
      setData({ emps: e, weekly: w, monthly: m, advances: a, shortages: s, wd: wdays })
      if (e.length) setSelEmp(e[0].name)
      setLoading(false)
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

  if (loading) return <Layout title="📜 Employee Ledger"><Spinner /></Layout>

  return (
    <Layout title="📜 Employee History & Ledger">
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Sidebar Selector */}
        <Panel title="Select Employee">
          <div className="form-group">
            <label>Employee Name</label>
            <select value={selEmp} onChange={e => setSelEmp(e.target.value)}>
              {data.emps.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          {stats && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--grey)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Standard Salary</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{fmt(stats.emp.salary)}</div>
              <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>{stats.emp.salary_type || 'Weekly'} worker</div>
            </div>
          )}
        </Panel>

        {/* Main Ledger Content */}
        {stats ? (
          <div>
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              <KpiCard label="Total Advance Given" value={fmt(stats.totalAdvGiven)} sub="Total from day one" icon="💸" color="blue" />
              <KpiCard label="Advance Deducted" value={fmt(stats.totalAdvDed)} sub="Recovered so far" icon="📥" color="green" />
              <KpiCard label="Advance Pending" value={fmt(stats.totalAdvGiven - stats.totalAdvDed)} sub="Balance to recover" icon="⏳" color="red" />
              <KpiCard label="Shortage Pending" value={fmt(stats.totalShrGiven - stats.totalShrDed)} sub="Balance to recover" icon="⚠️" color="orange" />
            </div>

            <Panel title={`Transaction History for ${selEmp}`} noPad>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th className="amt">Days/Lvs</th>
                      <th className="amt">Deductions</th>
                      <th className="amt">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.history.length ? stats.history.map((h, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(h.date)}</td>
                        <td>
                          <span className={`badge ${h.type.includes('Salary') ? 'badge-green' : 'badge-blue'}`}>
                            {h.type}
                          </span>
                        </td>
                        <td><span style={{ fontSize: 13, fontWeight: 500 }}>{h.label}</span> {h.remarks && <div style={{ fontSize: 10, color: 'var(--mid)' }}>{h.remarks}</div>}</td>
                        <td className="amt">
                          {h.days !== undefined ? (
                            <span style={{ fontSize: 12 }}>{h.days}d / {h.leaves}l</span>
                          ) : '—'}
                        </td>
                        <td className="amt">
                          {h.adv !== undefined ? (
                            <div style={{ fontSize: 11 }}>
                              {h.adv > 0 && <div style={{ color: 'var(--red)' }}>Adv: -{fmt(h.adv)}</div>}
                              {h.shr > 0 && <div style={{ color: 'var(--red)' }}>Shr: -{fmt(h.shr)}</div>}
                            </div>
                          ) : '—'}
                        </td>
                        <td className={`amt ${h.type.includes('Salary') ? 'amt-green' : 'amt-blue'}`} style={{ fontWeight: 700 }}>
                          {fmt(h.amt)}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--mid)' }}>No transaction history found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        ) : (
          <div className="empty-state">
            <p>Select an employee to view their ledger</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
