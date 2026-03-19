import { useState, useEffect } from 'react'
import { DB, fmt } from '../lib/db'
import { Layout } from '../components/Layout'
import { KpiCard, Panel, Spinner, ProgressBar } from '../components/UI'

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const [emps, weekly, advances, shortages, wd] = await Promise.all([
        DB.employees(), DB.weekly(), DB.advances(), DB.shortages(), DB.getWorkingDays()
      ])
      const totalPayroll = emps.reduce((s, e) => s + Number(e.salary), 0)
      const totalNet = weekly.reduce((s, w) => s + DB.weekSalary(w, emps.find(e => e.name === w.name), wd), 0)
      const pendAdv = emps.reduce((s, e) => s + DB.advPending(e.name, advances, weekly), 0)
      const pendShr = emps.reduce((s, e) => s + DB.shrPending(e.name, shortages, weekly), 0)
      const payMap = {}
      weekly.forEach(w => {
        const emp = emps.find(e => e.name === w.name)
        if (!emp) return
        payMap[w.name] = (payMap[w.name] || 0) + DB.weekSalary(w, emp, wd)
      })
      const top5 = Object.entries(payMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
      const recent = [...weekly].slice(0, 8)
      const advOverview = emps.filter(e => DB.totalAdvGiven(e.name, advances) || DB.totalShrGiven(e.name, shortages))
      setData({ emps, weekly, advances, shortages, wd, totalPayroll, totalNet, pendAdv, pendShr, top5, recent, advOverview })
    }
    load()
  }, [])

  if (!data) return <Layout title="📊 Dashboard"><Spinner /></Layout>

  const { emps, weekly, advances, shortages, wd, totalPayroll, totalNet, pendAdv, pendShr, top5, recent, advOverview } = data
  const maxPay = top5[0]?.[1] || 1

  return (
    <Layout title="📊 Dashboard">
      <div className="kpi-grid">
        <KpiCard label="Total Payroll" value={fmt(totalPayroll)} sub={`Monthly gross · ${emps.length} employees`} icon="💼" color="blue" />
        <KpiCard label="Total Net Paid" value={fmt(totalNet)} sub="All weekly entries" icon="✅" color="green" />
        <KpiCard label="Advance Pending" value={fmt(pendAdv)} sub="Still to recover" icon="💸" color="red" />
        <KpiCard label="Shortage Pending" value={fmt(pendShr)} sub="Still to recover" icon="⚠️" color="orange" />
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
            <div className="tbl-wrap">              <table>
                <thead><tr><th>Employee</th><th>Week</th><th>Salary</th></tr></thead>
                <tbody>
                  {recent.map(w => (
                    <tr key={w.id}>
                      <td><strong style={{ fontSize: 12 }}>{w.name}</strong></td>
                      <td><span className="badge badge-blue">{w.week_label || '—'}</span></td>
                      <td className="amt amt-green">{fmt(DB.weekSalary(w, emps.find(e => e.name === w.name), wd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state" style={{ padding: 32 }}><p>No entries yet</p></div>}
        </Panel>
      </div>

      <Panel title="Advance & Shortage Overview" noPad>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Employee</th><th>Adv Given</th><th>Adv Deducted</th><th>Adv Pending</th><th>Shr Given</th><th>Shr Deducted</th><th>Shr Pending</th></tr></thead>
            <tbody>
              {advOverview.length ? advOverview.map(e => {
                const ap = DB.advPending(e.name, advances, weekly)
                const sp = DB.shrPending(e.name, shortages, weekly)
                return (
                  <tr key={e.id}>
                    <td><strong>{e.name}</strong></td>
                    <td className="amt">{fmt(DB.totalAdvGiven(e.name, advances))}</td>
                    <td className="amt">{fmt(DB.totalAdvDeducted(e.name, weekly))}</td>
                    <td className={`amt ${ap > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(ap)}</td>
                    <td className="amt">{fmt(DB.totalShrGiven(e.name, shortages))}</td>
                    <td className="amt">{fmt(DB.totalShrDeducted(e.name, weekly))}</td>
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
