import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Panel, Spinner } from '../components/UI'

export function MonthlyPeriods() {
  const [periods, setPeriods]     = useState([])
  const [emps, setEmps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [viewModal, setViewModal] = useState(null)
  const [viewEntries, setViewEntries] = useState([])

  const load = useCallback(async () => {
    const [p, e] = await Promise.all([DB.monthlyPeriods(), DB.employees()])
    setPeriods(p)
    setEmps(e.filter(emp => emp.salary_type === 'monthly'))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const open   = periods.find(p => p.status === 'open')
  const closed = periods.filter(p => p.status === 'closed')

  const reopen = async p => {
    if (open && open.id !== p.id) { toast.error(`"${open.label}" is active. Close it first.`); return }
    await DB.reopenMonthlyPeriod(p.id)
    toast.success(`"${p.label}" reopened`)
    load()
  }

  const viewPeriod = async p => {
    const entries = await DB.monthlyByPeriod(p.id)
    setViewEntries(entries)
    setViewModal(p)
  }

  if (loading) return <Layout title="📆 Monthly Periods"><Spinner /></Layout>

  return (
    <Layout title="📆 Monthly Periods">
      {open ? (
        <div style={{ background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:14, padding:'22px 26px', marginBottom:24, color:'#fff' }}>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:1, opacity:.6, marginBottom:6 }}>🟣 Currently Active Monthly Period</div>
          <div style={{ fontSize:22, fontWeight:800 }}>{open.label}</div>
          <div style={{ opacity:.65, fontSize:13, marginTop:4 }}>📅 {new Date(open.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} → {new Date(open.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
      ) : (
        <div style={{ background:'#f3e8ff', border:'2px dashed #d8b4fe', borderRadius:14, padding:'22px 26px', marginBottom:24, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🗓️</div>
          <div style={{ fontWeight:700, color:'#5b21b6', fontSize:15, marginBottom:4 }}>No Active Monthly Period</div>
          <div style={{ color:'#7c3aed', fontSize:13 }}>Start a new period from the Monthly Entry page</div>
        </div>
      )}

      <Panel noPad title="📁 Completed Monthly Payrolls Archive" subtitle={`${closed.length} periods`}>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Period</th><th>Month</th><th>Dates</th><th>Closed On</th><th>Total Payroll</th><th>Actions</th></tr></thead>
            <tbody>
              {closed.length ? closed.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.label}</strong></td>
                  <td><span className="badge badge-blue" style={{ background:'#f3e8ff', color:'#7c3aed' }}>{p.month_name}</span></td>
                  <td style={{ fontSize:12, color:'var(--mid)' }}>{new Date(p.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(p.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ fontSize:12, color:'var(--mid)' }}>{p.closed_at ? new Date(p.closed_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                  <td className="amt amt-green"><strong>{fmt(p.total_payroll||0)}</strong></td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-ghost btn-sm" onClick={() => viewPeriod(p)}>👁️ View</button>
                      <button className="btn btn-sm" style={{ background:'#fef3c7', color:'#92400e' }} onClick={() => reopen(p)}>🔓 Reopen</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} style={{ textAlign:'center', padding:28, color:'var(--mid)' }}>No completed monthly payrolls yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {viewModal && (
        <Modal title={`📁 ${viewModal.label}`} onClose={() => setViewModal(null)} wide>
          <div style={{ fontSize:13, color:'var(--mid)', marginBottom:16 }}>{viewEntries.length} entries · Total: <strong className="amt-green">{fmt(viewModal.total_payroll||0)}</strong></div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Gross Salary</th><th>Adv Ded</th><th>Shr Ded</th><th>Net Salary</th></tr></thead>
              <tbody>
                {viewEntries.map(m => {
                  const emp = emps.find(e => e.name === m.name)
                  return (
                    <tr key={m.id}>
                      <td><strong style={{ fontSize:12 }}>{m.name}</strong></td>
                      <td className="amt amt-blue">{fmt(emp?.salary || 0)}</td>
                      <td className="amt amt-red">{fmt(m.adv_deducted||0)}</td>
                      <td className="amt amt-red">{fmt(m.shr_deducted||0)}</td>
                      <td className="amt amt-green"><strong>{fmt(DB.monthlySalary(m, emp))}</strong></td>
                    </tr>
                  )
                })}
                <tr style={{ background:'var(--navy)', color:'#fff', fontWeight:700 }}>
                  <td colSpan={4}>TOTAL</td>
                  <td className="amt" style={{ color:'#86efac', fontFamily:'var(--mono)' }}>{fmt(viewModal.total_payroll||0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
