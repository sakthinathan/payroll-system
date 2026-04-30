import { useState, useEffect, useMemo } from 'react'
import { DB, fmt } from '../lib/db'
import { Layout } from '../components/Layout'
import { KpiCard, Panel, Spinner, ProgressBar } from '../components/UI'

export default function Dashboard() {
  const [rawData, setRawData] = useState(null)

  useEffect(() => {
    async function load() {
      const [emps, weekly, advances, shortages, wd] = await Promise.all([
        DB.employees(), DB.weekly(), DB.advances(), DB.shortages(), DB.getWorkingDays()
      ])
      setRawData({ emps, weekly, advances, shortages, wd })
    }
    load()
  }, [])

  const stats = useMemo(() => {
    if (!rawData) return null
    const { emps, weekly, advances, shortages, wd } = rawData

    // 1. Create Lookup Maps (O(N))
    const empMap  = DB.createEmpMap(emps)
    const advMap  = DB.createAdvMap(advances)
    const shrMap  = DB.createAdvMap(shortages) // Reusing same logic for shortages
    const dedMapW = DB.createDedMap(weekly)

    // 2. Efficient single-pass calculations (O(N))
    const totalPayroll = emps.reduce((s, e) => s + Number(e.salary), 0)
    
    let totalNet = 0
    const payMap = {}
    weekly.forEach(w => {
      const emp = empMap[w.name]
      if (!emp) return
      const sal = DB.weekSalary(w, emp, wd)
      totalNet += sal
      payMap[w.name] = (payMap[w.name] || 0) + sal
    })

    const pendAdv = emps.reduce((s, e) => s + ((advMap[e.name] || 0) - (dedMapW.adv[e.name] || 0)), 0)
    const pendShr = emps.reduce((s, e) => s + ((shrMap[e.name] || 0) - (dedMapW.shr[e.name] || 0)), 0)

    const top5 = Object.entries(payMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const recent = [...weekly].slice(0, 8)
    const advOverview = emps.filter(e => advMap[e.name] || shrMap[e.name] || dedMapW.adv[e.name] || dedMapW.shr[e.name])

    // 3. Analytics: Monthly Trends (O(N))
    const monthTrend = {}
    weekly.forEach(w => {
      const month = w.week_label?.split(' ')[0] || 'Other'
      monthTrend[month] = (monthTrend[month] || 0) + DB.weekSalary(w, empMap[w.name], wd)
    })
    const trendData = Object.entries(monthTrend).slice(-6) // Last 6 months
    const maxTrend = Math.max(...trendData.map(d => d[1]), 1)

    return { 
      totalPayroll, totalNet, pendAdv, pendShr, top5, recent, advOverview, 
      empMap, advMap, shrMap, dedMapW, wd, trendData, maxTrend 
    }
  }, [rawData])

  if (!stats) return <Layout title="📊 Dashboard"><Spinner /></Layout>

  const { totalPayroll, totalNet, pendAdv, pendShr, top5, recent, advOverview, empMap, advMap, shrMap, dedMapW, wd, trendData, maxTrend } = stats
  const maxPay = top5[0]?.[1] || 1

  return (
    <Layout title="📊 Dashboard">
      <div className="kpi-grid">
        <KpiCard label="Total Payroll" value={fmt(totalPayroll)} sub={`Monthly gross · ${Object.keys(empMap).length} employees`} icon="💼" color="blue" />
        <KpiCard label="Total Net Paid" value={fmt(totalNet)} sub="All weekly entries" icon="✅" color="green" />
        <KpiCard label="Advance Pending" value={fmt(pendAdv)} sub="Still to recover" icon="💸" color="red" />
        <KpiCard label="Shortage Pending" value={fmt(pendShr)} sub="Still to recover" icon="⚠️" color="orange" />
      </div>

      {/* Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Panel title="Weekly Salary Expense Trend (Last 6 Months)">
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 12, padding: '20px 10px' }}>
            {trendData.length ? trendData.map(([month, amt]) => (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', background: 'linear-gradient(to top, var(--blue), #60a5fa)', height: `${(amt/maxTrend)*150}px`, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} title={fmt(amt)}></div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase' }}>{month.slice(0,3)}</div>
              </div>
            )) : <div className="empty-state"><p>Insufficient data for trend</p></div>}
          </div>
        </Panel>
        <Panel title="Quick Stats">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
            <div style={{ padding: 14, background: 'var(--grey)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase' }}>Avg. Weekly Payout</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(totalNet / (trendData.length || 1))}</div>
            </div>
            <div style={{ padding: 14, background: 'var(--grey)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase' }}>Recoverable Assets</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>{fmt(pendAdv + pendShr)}</div>
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Panel title="Top Earners (Weekly)">
          {top5.length ? top5.map(([name, amt]) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                <span className="amt amt-green">{fmt(amt)}</span>
              </div>
              <ProgressBar value={amt} max={maxPay} />
            </div>
          )) : <div className="empty-state"><p>No weekly entries yet</p></div>}
        </Panel>

        <Panel title="Recent Weekly Entries" noPad>
          {recent.length ? (
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Week</th><th>Salary</th></tr></thead>
                <tbody>
                  {recent.map(w => (
                    <tr key={w.id}>
                      <td><strong style={{ fontSize: 12 }}>{w.name}</strong></td>
                      <td><span className="badge badge-blue">{w.week_label || '—'}</span></td>
                      <td className="amt amt-green">{fmt(DB.weekSalary(w, empMap[w.name], wd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state" style={{ padding: 32 }}><p>No entries yet</p></div>}
        </Panel>
      </div>

      <Panel title="Advance & Shortage Overview" noPad>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Adv Given</th><th>Adv Deducted</th><th>Adv Pending</th><th>Shr Given</th><th>Shr Deducted</th><th>Shr Pending</th></tr></thead>
            <tbody>
              {advOverview.length ? advOverview.map(e => {
                const aGiven = advMap[e.name] || 0
                const aDed   = dedMapW.adv[e.name] || 0
                const sGiven = shrMap[e.name] || 0
                const sDed   = dedMapW.shr[e.name] || 0
                const ap = aGiven - aDed
                const sp = sGiven - sDed
                return (
                  <tr key={e.id}>
                    <td><strong>{e.name}</strong></td>
                    <td className="amt">{fmt(aGiven)}</td>
                    <td className="amt">{fmt(aDed)}</td>
                    <td className={`amt ${ap > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(ap)}</td>
                    <td className="amt">{fmt(sGiven)}</td>
                    <td className="amt">{fmt(sDed)}</td>
                    <td className={`amt ${sp > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(sp)}</td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--mid)' }}>No advances or shortages recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </Layout>
  )
}
