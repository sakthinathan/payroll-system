import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'
import { useNavigate } from 'react-router-dom'

// ── PAYROLL PERIODS ──────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function Periods() {
  const [periods, setPeriods] = useState([])
  const [emps, setEmps] = useState([])
  const [wd, setWd] = useState(26)
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)
  const [viewEntries, setViewEntries] = useState([])
  const navigate = useNavigate()
  const now = new Date()
  const [newPeriod, setNewPeriod] = useState({
    month: now.getMonth(), year: now.getFullYear(), weekNum: 1, label: '', dateFrom: '', dateTo: ''
  })

  const load = useCallback(async () => {
    const [p, e, w] = await Promise.all([DB.periods(), DB.employees(), DB.getWorkingDays()])
    setPeriods(p); setEmps(e); setWd(w); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const open  = periods.find(p => p.status === 'open')
  const closed = periods.filter(p => p.status === 'closed')

  // Auto-calc dates
  useEffect(() => {
    const { month, year, weekNum } = newPeriod
    const ranges = [[1,7],[8,14],[15,21],[22,28],[29,null]]
    const [dayFrom, dayTo] = ranges[weekNum - 1]
    const lastDay = new Date(year, month + 1, 0).getDate()
    const pad = n => String(n).padStart(2, '0')
    const from = `${year}-${pad(month+1)}-${pad(dayFrom)}`
    const to   = `${year}-${pad(month+1)}-${pad(dayTo || lastDay)}`
    const autoLabel = `${MONTHS[month]} Week ${weekNum}`
    setNewPeriod(p => ({ ...p, dateFrom: from, dateTo: to, label: p.label || autoLabel }))
  }, [newPeriod.month, newPeriod.year, newPeriod.weekNum])

  const startPeriod = async () => {
    if (!newPeriod.dateFrom || !newPeriod.dateTo) { toast.error('Select dates'); return }
    await DB.savePeriod({
      id: uid(), label: newPeriod.label,
      month_name: `${MONTHS[newPeriod.month]} ${newPeriod.year}`,
      date_from: newPeriod.dateFrom, date_to: newPeriod.dateTo, status: 'open'
    })
    toast.success(`"${newPeriod.label}" started!`)
    setNewPeriod(p => ({ ...p, label: '' }))
    load()
  }

  const reopen = async (p) => {
    if (open && open.id !== p.id) { toast.error(`"${open.label}" is active. Close it first.`); return }
    await DB.reopenPeriod(p.id)
    toast.success(`"${p.label}" reopened`)
    load()
  }

  const viewPeriod = async (p) => {
    const entries = await DB.weeklyByPeriod(p.id)
    setViewEntries(entries)
    setViewModal(p)
  }

  if (loading) return <Layout title="📆 Payroll Periods"><Spinner /></Layout>

  return (
    <Layout title="📆 Payroll Periods">
      {/* Active Period */}
      {open ? (
        <div style={{ background: 'linear-gradient(135deg,#1F3864,#2E75B6)', borderRadius: 14, padding: '22px 26px', marginBottom: 24, color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: .6, marginBottom: 6 }}>🟢 Currently Active Period</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{open.label}</div>
          <div style={{ opacity: .65, fontSize: 13, marginTop: 4 }}>
            📅 {new Date(open.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} → {new Date(open.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
          </div>
          <button className="btn" style={{ marginTop: 14, background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
            onClick={() => navigate('/weekly')}>
            📅 Go to Weekly Entry →
          </button>
        </div>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px dashed #86efac', borderRadius: 14, padding: '22px 26px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📆</div>
          <div style={{ fontWeight: 700, color: '#166534', fontSize: 15, marginBottom: 4 }}>No Active Payroll Period</div>
          <div style={{ color: '#15803d', fontSize: 13 }}>Start a new period to begin entering weekly attendance</div>
        </div>
      )}

      {/* Start New Period */}
      {!open && (
        <Panel title="➕ Start New Payroll Period" headerColor="#166534">
          <div className="form-grid cols2" style={{ gap: 16, marginBottom: 16 }}>
            <Field label="Month">
              <select value={newPeriod.month} onChange={e => setNewPeriod(p => ({ ...p, month: Number(e.target.value), label: '' }))}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <select value={newPeriod.year} onChange={e => setNewPeriod(p => ({ ...p, year: Number(e.target.value), label: '' }))}>
                {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Week Number">
              <select value={newPeriod.weekNum} onChange={e => setNewPeriod(p => ({ ...p, weekNum: Number(e.target.value), label: '' }))}>
                <option value={1}>Week 1 (1st – 7th)</option>
                <option value={2}>Week 2 (8th – 14th)</option>
                <option value={3}>Week 3 (15th – 21st)</option>
                <option value={4}>Week 4 (22nd – 28th)</option>
                <option value={5}>Week 5 (29th – End)</option>
              </select>
            </Field>
            <Field label="Label">
              <input value={newPeriod.label} onChange={e => setNewPeriod(p => ({ ...p, label: e.target.value }))} placeholder="e.g. March Week 1" />
            </Field>
            <Field label="From Date"><input type="date" value={newPeriod.dateFrom} onChange={e => setNewPeriod(p => ({ ...p, dateFrom: e.target.value }))} /></Field>
            <Field label="To Date"><input type="date" value={newPeriod.dateTo} onChange={e => setNewPeriod(p => ({ ...p, dateTo: e.target.value }))} /></Field>
          </div>
          {newPeriod.dateFrom && (
            <div style={{ background: 'var(--lblue)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--navy)', marginBottom: 16 }}>
              📅 <strong>{newPeriod.label}</strong> &nbsp;·&nbsp;
              {new Date(newPeriod.dateFrom).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} to {new Date(newPeriod.dateTo).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}
            </div>
          )}
          <button className="btn btn-success" onClick={startPeriod}>🟢 Start This Payroll Period</button>
        </Panel>
      )}

      {/* Archive */}
      <Panel noPad title="📁 Completed Payrolls Archive" subtitle={`${closed.length} periods`}>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Period</th><th>Month</th><th>Dates</th><th>Closed On</th><th>Total Payroll</th><th>Actions</th></tr></thead>
            <tbody>
              {closed.length ? closed.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.label}</strong></td>
                  <td><span className="badge badge-blue">{p.month_name}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {new Date(p.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(p.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {p.closed_at ? new Date(p.closed_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td className="amt amt-green"><strong>{fmt(p.total_payroll || 0)}</strong></td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-ghost btn-sm" onClick={() => viewPeriod(p)}>👁️ View</button>
                      <button className="btn btn-sm" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => reopen(p)}>🔓 Reopen</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No completed payrolls yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* View Period Modal */}
      {viewModal && (
        <Modal title={`📁 ${viewModal.label}`} onClose={() => setViewModal(null)} wide>
          <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 16 }}>
            {viewEntries.length} entries · Total: <strong className="amt-green">{fmt(viewModal.total_payroll || 0)}</strong>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Days</th><th>Leaves</th><th>Adv Ded</th><th>Shr Ded</th><th>Salary</th></tr></thead>
              <tbody>
                {viewEntries.map(w => {
                  const emp = emps.find(e => e.name === w.name)
                  return (
                    <tr key={w.id}>
                      <td><strong style={{ fontSize: 12 }}>{w.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{w.days_worked || 0}</td>
                      <td style={{ textAlign: 'center' }}>{w.leaves || 0}</td>
                      <td className="amt amt-red">{fmt(w.adv_deducted || 0)}</td>
                      <td className="amt amt-red">{fmt(w.shr_deducted || 0)}</td>
                      <td className="amt amt-green"><strong>{fmt(DB.weekSalary(w, emp, wd))}</strong></td>
                    </tr>
                  )
                })}
                <tr style={{ background: 'var(--navy)', color: '#fff', fontWeight: 700 }}>
                  <td colSpan={5}>TOTAL</td>
                  <td className="amt" style={{ color: '#86efac', fontFamily: 'var(--mono)' }}>{fmt(viewModal.total_payroll || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

// ── WEEKLY ENTRY ─────────────────────────────────────────────────
export function Weekly() {
  const [allWeekly, setAllWeekly] = useState([])
  const [emps, setEmps] = useState([])
  const [advances, setAdvances] = useState([])
  const [shortages, setShortages] = useState([])
  const [wd, setWd] = useState(26)
  const [activePeriod, setActivePeriod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', daysWorked: 6, leaves: 0, advDeducted: 0, shrDeducted: 0 })
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkForm, setBulkForm] = useState({ daysWorked: 6, leaves: 0, advDeducted: 0, shrDeducted: 0 })
  const [closeConfirm, setCloseConfirm] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const [w, e, a, s, wdays, ap] = await Promise.all([
      DB.weekly(), DB.employees(), DB.advances(), DB.shortages(), DB.getWorkingDays(), DB.openPeriod()
    ])
    const periodEntries = ap ? w.filter(x => x.period_id === ap.id) : []
    setAllWeekly(periodEntries); setEmps(e); setAdvances(a); setShortages(s); setWd(wdays); setActivePeriod(ap)
    setLoading(false)
    if (e.length) setForm(f => ({ ...f, name: e[0].name }))
  }, [])
  useEffect(() => { load() }, [load])

  const enteredNames = new Set(allWeekly.map(w => w.name))
  const pendingEmps  = emps.filter(e => !enteredNames.has(e.name))
  const totalPay     = allWeekly.reduce((s, w) => s + DB.weekSalary(w, emps.find(e => e.name === w.name), wd), 0)
  const filtered     = allWeekly.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()))

  const saveEntry = async (isEdit = false) => {
    if (!activePeriod) { toast.error('No active period'); return }
    if (isEdit) {
      await DB.updateWeekly({ id: modal.entry.id, ...form, weekLabel: activePeriod.label, date: activePeriod.date_from, periodId: activePeriod.id })
      toast.success('Updated ✅')
    } else {
      await DB.saveWeekly({ id: uid(), ...form, weekLabel: activePeriod.label, date: activePeriod.date_from, periodId: activePeriod.id })
      toast.success('Entry saved ✅')
    }
    setModal(null); load()
  }

  const del = async id => { await DB.deleteWeekly(id); toast.error('Deleted'); setConfirm(null); load() }

  const bulkAdd = async () => {
    for (const emp of pendingEmps) {
      await DB.saveWeekly({ id: uid(), name: emp.name, weekLabel: activePeriod.label, date: activePeriod.date_from, ...bulkForm, periodId: activePeriod.id })
    }
    toast.success(`${pendingEmps.length} entries added ✅`)
    setBulkModal(false); load()
  }

  const closePayroll = async () => {
    await DB.closePeriod(activePeriod.id, totalPay)
    toast.success(`✅ ${activePeriod.label} closed! Total: ${fmt(totalPay)}`)
    setCloseConfirm(false); load()
  }

  if (loading) return <Layout title="📅 Weekly Entry"><Spinner /></Layout>

  return (
    <Layout title="📅 Weekly Entry">
      {/* Period Banner */}
      {!activePeriod ? (
        <div style={{ background: '#fef3c7', borderRadius: 12, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>⚠️ No Active Payroll Period</div>
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Start a period before entering attendance</div>
          </div>
          <button className="btn" style={{ background: '#d97706', color: '#fff' }} onClick={() => navigate('/periods')}>📆 Go to Payroll Periods →</button>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg,#1F3864,#2E75B6)', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>🟢 Active Period</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginTop: 2 }}>{activePeriod.label}</div>
              <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 12, marginTop: 2 }}>
                {allWeekly.length}/{emps.length} employees · Total: {fmt(totalPay)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {pendingEmps.length > 0 && (
                <button className="btn" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
                  onClick={() => setBulkModal(true)}>
                  ⚡ Bulk Add ({pendingEmps.length} pending)
                </button>
              )}
              <button className="btn" style={{ background: '#16a34a', color: '#fff' }} onClick={() => setCloseConfirm(true)}>
                🔒 Close & Complete Payroll
              </button>
            </div>
          </div>
          {pendingEmps.length === 0
            ? <div style={{ marginTop: 12, background: 'rgba(34,197,94,.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#bbf7d0' }}>✅ All {emps.length} employees entered — ready to close!</div>
            : <div style={{ marginTop: 12, background: 'rgba(255,165,0,.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#fde68a' }}>⚠️ {pendingEmps.length} employees still pending</div>
          }
        </div>
      )}

      <div className="toolbar">
        <div className="search-box"><input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {activePeriod && <button className="btn btn-primary" onClick={() => { setForm(f => ({ ...f, name: emps[0]?.name || '' })); setModal({ type: 'add' }) }}>+ Add Entry</button>}
      </div>

      <Panel noPad title={`Weekly Attendance — ${activePeriod?.label || 'No Active Period'}`} subtitle={`Working days: ${wd}`}>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Employee</th><th>Days</th><th>Leaves</th><th>Adv Ded</th><th>Shr Ded</th><th>Adv Pending</th><th>Shr Pending</th><th>Salary</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(w => {
                const emp = emps.find(e => e.name === w.name)
                const ap  = DB.advPending(w.name, advances, allWeekly)
                const sp  = DB.shrPending(w.name, shortages, allWeekly)
                return (
                  <tr key={w.id}>
                    <td><strong style={{ fontSize: 12 }}>{w.name}</strong></td>
                    <td style={{ textAlign: 'center' }}>{w.days_worked || 0}</td>
                    <td style={{ textAlign: 'center' }}>{w.leaves || 0}</td>
                    <td className="amt amt-red">{fmt(w.adv_deducted || 0)}</td>
                    <td className="amt amt-red">{fmt(w.shr_deducted || 0)}</td>
                    <td className={`amt ${ap > 0 ? 'amt-blue' : 'amt-green'}`}>{fmt(ap)}</td>
                    <td className={`amt ${sp > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(sp)}</td>
                    <td className="amt amt-green"><strong>{fmt(DB.weekSalary(w, emp, wd))}</strong></td>
                    <td>
                      <div className="flex-gap">
                        <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ name: w.name, daysWorked: w.days_worked, leaves: w.leaves, advDeducted: w.adv_deducted, shrDeducted: w.shr_deducted }); setModal({ type: 'edit', entry: w }) }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirm(w.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pendingEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())).map(e => (
                <tr key={e.id} style={{ background: '#fffbeb', opacity: .7 }}>
                  <td><strong style={{ fontSize: 12, color: 'var(--mid)' }}>{e.name}</strong> <span style={{ fontSize: 10, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: 10 }}>Pending</span></td>
                  <td colSpan={7} style={{ color: 'var(--mid)', fontSize: 12, textAlign: 'center' }}>Not entered yet</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => { setForm(f => ({ ...f, name: e.name })); setModal({ type: 'add' }) }}>+ Add</button></td>
                </tr>
              ))}
              {!filtered.length && !pendingEmps.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No entries for this period</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Entry Modal */}
      {modal && (
        <Modal title={modal.type === 'add' ? 'Add Weekly Entry' : 'Edit Weekly Entry'} onClose={() => setModal(null)} onSave={() => saveEntry(modal.type === 'edit')}>
          <div className="form-grid cols2">
            <Field label="Employee" style={{ gridColumn: '1/-1' }}>
              <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Days Worked (0–7)"><input type="number" min={0} max={7} value={form.daysWorked} onChange={e => setForm(f => ({ ...f, daysWorked: Number(e.target.value) }))} /></Field>
            <Field label="Leaves (0–7)"><input type="number" min={0} max={7} value={form.leaves} onChange={e => setForm(f => ({ ...f, leaves: Number(e.target.value) }))} /></Field>
            <Field label="Advance Deducted (₹)"><input type="number" min={0} value={form.advDeducted} onChange={e => setForm(f => ({ ...f, advDeducted: Number(e.target.value) }))} /></Field>
            <Field label="Shortage Deducted (₹)"><input type="number" min={0} value={form.shrDeducted} onChange={e => setForm(f => ({ ...f, shrDeducted: Number(e.target.value) }))} /></Field>
          </div>
        </Modal>
      )}

      {/* Bulk Add Modal */}
      {bulkModal && (
        <Modal title={`⚡ Bulk Add — ${activePeriod?.label}`} onClose={() => setBulkModal(false)} onSave={bulkAdd} saveLabel={`⚡ Add All ${pendingEmps.length}`}>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 16 }}>Set default values for all {pendingEmps.length} pending employees:</p>
          <div style={{ background: 'var(--grey)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div className="form-grid cols2" style={{ gap: 12 }}>
              <Field label="Days Worked"><input type="number" min={0} max={7} value={bulkForm.daysWorked} onChange={e => setBulkForm(f => ({ ...f, daysWorked: Number(e.target.value) }))} /></Field>
              <Field label="Leaves"><input type="number" min={0} max={7} value={bulkForm.leaves} onChange={e => setBulkForm(f => ({ ...f, leaves: Number(e.target.value) }))} /></Field>
              <Field label="Advance Deducted (₹)"><input type="number" min={0} value={bulkForm.advDeducted} onChange={e => setBulkForm(f => ({ ...f, advDeducted: Number(e.target.value) }))} /></Field>
              <Field label="Shortage Deducted (₹)"><input type="number" min={0} value={bulkForm.shrDeducted} onChange={e => setBulkForm(f => ({ ...f, shrDeducted: Number(e.target.value) }))} /></Field>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>
            Employees: <strong style={{ color: 'var(--navy)' }}>{pendingEmps.map(e => e.name).join(', ')}</strong>
          </div>
        </Modal>
      )}

      {/* Close Payroll Confirm */}
      {closeConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCloseConfirm(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h3>🔒 Close Payroll — {activePeriod?.label}</h3></div>
            <div style={{ background: 'var(--grey)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ fontSize: 12 }}><span style={{ color: 'var(--mid)' }}>Entries:</span><br /><strong>{allWeekly.length} / {emps.length}</strong></div>
                <div style={{ fontSize: 12 }}><span style={{ color: 'var(--mid)' }}>Total:</span><br /><strong className="amt-green">{fmt(totalPay)}</strong></div>
                <div style={{ fontSize: 12 }}><span style={{ color: 'var(--mid)' }}>Missing:</span><br /><strong style={{ color: pendingEmps.length > 0 ? 'var(--red)' : 'var(--green)' }}>{pendingEmps.length} employees</strong></div>
              </div>
            </div>
            {pendingEmps.length > 0 && <div style={{ background: 'var(--lred)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>⚠️ {pendingEmps.length} employees have no entry.</div>}
            <p style={{ fontSize: 13, color: '#444', marginBottom: 18 }}>Period will be <strong>locked and archived</strong>. Weekly Entry resets for the next week.</p>
            <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCloseConfirm(false)}>Cancel</button>
              <button className="btn btn-success btn-sm" onClick={closePayroll}>🔒 Yes, Close Payroll</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <Confirm message="Delete this entry?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
