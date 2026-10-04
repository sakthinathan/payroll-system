// ── Advances Page ────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, fmtDate, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'
import { supabase } from '../lib/db'

export function Advances() {
  const [advances, setAdvances] = useState([])
  const [weekly, setWeekly] = useState([])
  const [monthly, setMonthly] = useState([])
  const [emps, setEmps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), name: '', amount: '', remarks: '' })

  const load = useCallback(async () => {
    const [a, w, m, e] = await Promise.all([DB.advances(), DB.weekly(), DB.monthlyAll(), DB.employees()])
    setAdvances(a); setWeekly(w); setMonthly(m); setEmps(e); setLoading(false)
    if (e.length && !form.name) setForm(f => ({ ...f, name: e[0].name }))
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = advances.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))
  const total = advances.reduce((s, a) => s + Number(a.amount), 0)
  const totalPend = emps.reduce((s, e) => s + DB.advPending(e.name, advances, weekly, monthly), 0)

  const save = async () => {
    const amt = Number(form.amount)
    if (!amt) { toast.error('Enter amount'); return }
    await DB.saveAdvance({ id: uid(), ...form, amount: amt })
    toast.success('Advance recorded ✅')
    setModal(false); load()
  }

  const del = async id => {
    await DB.deleteAdvance(id); toast.error('Deleted'); setConfirm(null); load()
  }

  if (loading) return <Layout title="💰 Advance Log"><Spinner /></Layout>

  return (
    <Layout title="💰 Advance Log">
      <div className="toolbar">
        <div className="search-box"><input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="flex-gap">
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>Total: <strong className="amt-blue" style={{ fontFamily: 'var(--mono)' }}>{fmt(total)}</strong></span>
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>Pending: <strong className="amt-red" style={{ fontFamily: 'var(--mono)' }}>{fmt(totalPend)}</strong></span>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Advance</button>
        </div>
      </div>
      <Panel title="Advance Transaction Log" noPad>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Date</th><th>Employee</th><th>Given</th><th>Deducted</th><th>Pending</th><th>Remarks</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(a => {
                const ded = DB.totalAdvDeducted(a.name, weekly, monthly)
                const pend = DB.advPending(a.name, advances, weekly, monthly)
                return (
                  <tr key={a.id}>
                    <td>{fmtDate(a.date)}</td>
                    <td><strong style={{ fontSize: 12 }}>{a.name}</strong></td>
                    <td className="amt amt-blue">{fmt(a.amount)}</td>
                    <td className="amt amt-red">{fmt(ded)}</td>
                    <td className={`amt ${pend > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(pend)}</td>
                    <td style={{ fontSize: 12, color: 'var(--mid)' }}>{a.remarks || '—'}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setConfirm(a.id)}>🗑️</button></td>
                  </tr>
                )
              })}
              {!filtered.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No advances yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <Modal title="Record New Advance" onClose={() => setModal(false)} onSave={save}>
          <div className="form-grid cols2">
            <Field label="Date"><input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Employee">
              <select className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)"><input type="number" className="form-input" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 2000" /></Field>
            <Field label="Remarks"><input className="form-input" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Medical" /></Field>
          </div>
        </Modal>
      )}
      {confirm && <Confirm message="Delete this advance?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}

// ── Shortages Page ───────────────────────────────────────────────
export function Shortages() {
  const [shortages, setShortages] = useState([])
  const [weekly, setWeekly] = useState([])
  const [monthly, setMonthly] = useState([])
  const [emps, setEmps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), name: '', amount: '', remarks: '' })

  const load = useCallback(async () => {
    const [s, w, m, e] = await Promise.all([DB.shortages(), DB.weekly(), DB.monthlyAll(), DB.employees()])
    setShortages(s); setWeekly(w); setMonthly(m); setEmps(e); setLoading(false)
    if (e.length && !form.name) setForm(f => ({ ...f, name: e[0].name }))
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = shortages.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))
  const total = shortages.reduce((s, a) => s + Number(a.amount), 0)
  const totalPend = emps.reduce((s, e) => s + DB.shrPending(e.name, shortages, weekly, monthly), 0)

  const save = async () => {
    const amt = Number(form.amount)
    if (!amt) { toast.error('Enter amount'); return }
    await DB.saveShortage({ id: uid(), ...form, amount: amt })
    toast.success('Shortage recorded ✅'); setModal(false); load()
  }

  const del = async id => { await DB.deleteShortage(id); toast.error('Deleted'); setConfirm(null); load() }

  if (loading) return <Layout title="⚠️ Shortage Log"><Spinner /></Layout>

  return (
    <Layout title="⚠️ Shortage Log">
      <div className="toolbar">
        <div className="search-box"><input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="flex-gap">
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>Total: <strong className="amt-red" style={{ fontFamily: 'var(--mono)' }}>{fmt(total)}</strong></span>
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>Pending: <strong className="amt-red" style={{ fontFamily: 'var(--mono)' }}>{fmt(totalPend)}</strong></span>
          <button className="btn btn-danger" onClick={() => setModal(true)}>+ Add Shortage</button>
        </div>
      </div>
      <Panel title="Shortage Transaction Log" headerColor="var(--red)" noPad>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Deducted</th><th>Pending</th><th>Remarks</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(a => {
                const pend = DB.shrPending(a.name, shortages, weekly, monthly)
                return (
                  <tr key={a.id}>
                    <td>{fmtDate(a.date)}</td>
                    <td><strong style={{ fontSize: 12 }}>{a.name}</strong></td>
                    <td className="amt amt-red">{fmt(a.amount)}</td>
                    <td className="amt amt-red">{fmt(DB.totalShrDeducted(a.name, weekly, monthly))}</td>
                    <td className={`amt ${pend > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(pend)}</td>
                    <td style={{ fontSize: 12, color: 'var(--mid)' }}>{a.remarks || '—'}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setConfirm(a.id)}>🗑️</button></td>
                  </tr>
                )
              })}
              {!filtered.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No shortages yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <Modal title="Record Shortage" onClose={() => setModal(false)} onSave={save}>
          <div className="form-grid cols2">
            <Field label="Date"><input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Employee">
              <select className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)"><input type="number" className="form-input" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
            <Field label="Remarks"><input className="form-input" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Material damage" /></Field>
          </div>
        </Modal>
      )}
      {confirm && <Confirm message="Delete this shortage?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}

// ── Deduction Master ─────────────────────────────────────────────
export function Deductions() {
  const [data, setData] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([DB.employees(), DB.advances(), DB.shortages(), DB.weekly(), DB.monthlyAll()])
      .then(([emps, advances, shortages, weekly, monthly]) => setData({ emps, advances, shortages, weekly, monthly }))
  }, [])

  if (!data) return <Layout title="📋 Deduction Master"><Spinner /></Layout>
  const { emps, advances, shortages, weekly, monthly } = data

  // Precalculate stats for all employees
  const empStats = emps.map(e => {
    const advGiven = DB.totalAdvGiven(e.name, advances)
    const advDeducted = DB.totalAdvDeducted(e.name, weekly, monthly)
    const advPending = advGiven - advDeducted

    const shrGiven = DB.totalShrGiven(e.name, shortages)
    const shrDeducted = DB.totalShrDeducted(e.name, weekly, monthly)
    const shrPending = shrGiven - shrDeducted

    const hasAdv = advGiven > 0 || advDeducted > 0 || advPending > 0
    const hasShr = shrGiven > 0 || shrDeducted > 0 || shrPending > 0

    return {
      id: e.id,
      emp_id: e.emp_id,
      name: e.name,
      advGiven, advDeducted, advPending, hasAdv,
      shrGiven, shrDeducted, shrPending, hasShr
    }
  })

  // Filtered lists for display
  const cleanSearch = search.trim().toLowerCase()

  const advList = empStats.filter(s => {
    const match = !cleanSearch || s.name.toLowerCase().includes(cleanSearch) || (s.emp_id && s.emp_id.toLowerCase().includes(cleanSearch))
    return match && (showAll || s.hasAdv)
  })

  const shrList = empStats.filter(s => {
    const match = !cleanSearch || s.name.toLowerCase().includes(cleanSearch) || (s.emp_id && s.emp_id.toLowerCase().includes(cleanSearch))
    return match && (showAll || s.hasShr)
  })

  // Summary Totals
  const totalAdvGiven = empStats.reduce((s, x) => s + x.advGiven, 0)
  const totalAdvDeducted = empStats.reduce((s, x) => s + x.advDeducted, 0)
  const totalAdvPending = totalAdvGiven - totalAdvDeducted

  const totalShrGiven = empStats.reduce((s, x) => s + x.shrGiven, 0)
  const totalShrDeducted = empStats.reduce((s, x) => s + x.shrDeducted, 0)
  const totalShrPending = totalShrGiven - totalShrDeducted

  const activeAdvCount = empStats.filter(x => x.advPending > 0).length
  const activeShrCount = empStats.filter(x => x.shrPending > 0).length

  return (
    <Layout title="📋 Deduction Master">
      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Pending Advances</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)', margin: '4px 0 2px' }}>{fmt(totalAdvPending)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>{activeAdvCount} staff with outstanding advance</div>
          </div>
          <div style={{ background: '#E0F2FE', color: '#0369A1', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Pending Shortages</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--brit-red)', margin: '4px 0 2px' }}>{fmt(totalShrPending)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>{activeShrCount} staff with pending shortage</div>
          </div>
          <div style={{ background: '#FEE2E2', color: '#DC2626', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase' }}>Total Deductions Outstanding</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--brit-red)', margin: '4px 0 2px' }}>{fmt(totalAdvPending + totalShrPending)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>Combined advance & shortage balance</div>
          </div>
          <div style={{ background: '#FEF3C7', color: '#D97706', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📊</div>
        </div>
      </div>

      {/* ── TOOLBAR & CONTROLS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div className="search-box" style={{ maxWidth: 340 }}>
          <input 
            placeholder="Search employee by name or ID..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>
            Showing: <strong>{showAll ? `All ${emps.length} Staff` : `Only Staff with Deductions (${empStats.filter(s => s.hasAdv || s.hasShr).length})`}</strong>
          </span>
          <button 
            type="button" 
            className="btn btn-sm" 
            style={{ 
              background: showAll ? 'var(--navy)' : 'var(--brit-cream-light)', 
              color: showAll ? '#FFFFFF' : 'var(--navy)',
              border: '1.5px solid var(--border)',
              fontWeight: 800
            }}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Active Deductions Only' : 'Show All Employees'}
          </button>
        </div>
      </div>

      {/* ── EQUAL 2-COLUMN ALIGNED LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Advance Summary */}
        <Panel title="💰 Advance Summary" subtitle="Staff Advance Loans & Recoveries" noPad>
          <div className="tbl-wrap">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Employee</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Given</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Deducted</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {advList.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ fontSize: 13, color: 'var(--navy)' }}>{s.name}</strong>
                      {s.emp_id && <div style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 700 }}>{s.emp_id}</div>}
                    </td>
                    <td className="amt amt-blue" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(s.advGiven)}</td>
                    <td className="amt" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(s.advDeducted)}</td>
                    <td className={`amt ${s.advPending > 0 ? 'amt-red' : 'amt-green'}`} style={{ textAlign: 'right', fontWeight: 900 }}>
                      {fmt(s.advPending)}
                    </td>
                  </tr>
                ))}

                {advList.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontWeight: 600 }}>
                      No staff with advance balances found.
                    </td>
                  </tr>
                )}

                <tr style={{ background: 'var(--navy)', color: '#FFFFFF', fontWeight: 800 }}>
                  <td>TOTAL ADVANCE</td>
                  <td className="amt" style={{ textAlign: 'right', color: '#7DD3FC', fontFamily: 'var(--mono)' }}>{fmt(totalAdvGiven)}</td>
                  <td className="amt" style={{ textAlign: 'right', color: '#FFFFFF', fontFamily: 'var(--mono)' }}>{fmt(totalAdvDeducted)}</td>
                  <td className="amt" style={{ textAlign: 'right', color: '#86EFAC', fontFamily: 'var(--mono)', fontSize: 14 }}>{fmt(totalAdvPending)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Right Column: Shortage Summary */}
        <Panel title="⚠️ Shortage Summary" subtitle="Staff Shortages & Deductions" headerColor="var(--brit-red)" noPad>
          <div className="tbl-wrap">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Employee</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Given</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Deducted</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {shrList.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ fontSize: 13, color: 'var(--navy)' }}>{s.name}</strong>
                      {s.emp_id && <div style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 700 }}>{s.emp_id}</div>}
                    </td>
                    <td className="amt amt-red" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(s.shrGiven)}</td>
                    <td className="amt" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(s.shrDeducted)}</td>
                    <td className={`amt ${s.shrPending > 0 ? 'amt-red' : 'amt-green'}`} style={{ textAlign: 'right', fontWeight: 900 }}>
                      {fmt(s.shrPending)}
                    </td>
                  </tr>
                ))}

                {shrList.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontWeight: 600 }}>
                      No staff with shortage balances found.
                    </td>
                  </tr>
                )}

                <tr style={{ background: 'var(--brit-red)', color: '#FFFFFF', fontWeight: 800 }}>
                  <td>TOTAL SHORTAGE</td>
                  <td className="amt" style={{ textAlign: 'right', color: '#FCA5A5', fontFamily: 'var(--mono)' }}>{fmt(totalShrGiven)}</td>
                  <td className="amt" style={{ textAlign: 'right', color: '#FFFFFF', fontFamily: 'var(--mono)' }}>{fmt(totalShrDeducted)}</td>
                  <td className="amt" style={{ textAlign: 'right', color: '#BBF7D0', fontFamily: 'var(--mono)', fontSize: 14 }}>{fmt(totalShrPending)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </Layout>
  )
}

// ── Bank Master ──────────────────────────────────────────────────
export function Bank() {
  const [bank, setBank] = useState([])
  const [emps, setEmps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', bank: 'SBI', acc: '', ifsc: '', branch: 'Erode', phone: '' })

  const load = useCallback(async () => {
    const [b, e] = await Promise.all([DB.bank(), DB.employees()])
    setBank(b); setEmps(e); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = bank.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd  = () => { 
    const first = emps[0]
    setForm({ name: first?.name || '', bank: 'SBI', acc: '', ifsc: '', branch: 'Erode', phone: first?.phone || '' })
    setModal('add') 
  }
  const openEdit = b => { 
    const emp = emps.find(e => e.name === b.name)
    setForm({ ...b, phone: emp?.phone || b.phone || '' })
    setModal('edit') 
  }

  const save = async () => {
    if (!form.acc) { toast.error('Account number required'); return }
    await DB.upsertBank({ ...form, ifsc: form.ifsc.toUpperCase() })
    toast.success('Saved ✅'); setModal(null); load()
  }

  const del = async name => { await DB.deleteBank(name); toast.error('Deleted'); setConfirm(null); load() }

  if (loading) return <Layout title="🏦 Bank Master"><Spinner /></Layout>

  return (
    <Layout title="🏦 Bank Master">
      <div className="toolbar">
        <div className="search-box"><input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Bank Account</button>
      </div>
      <Panel title="Employee Bank Accounts" noPad>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Employee</th><th>Bank</th><th>Account No.</th><th>IFSC</th><th>Branch</th><th>📱 WhatsApp</th><th>Salary</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(b => {
                const emp = emps.find(e => e.name === b.name)
                const phone = emp?.phone || b.phone
                return (
                  <tr key={b.name}>
                    <td><strong style={{ fontSize: 12 }}>{b.name}</strong></td>
                    <td><span className="badge badge-blue">{b.bank || '—'}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{b.acc || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{b.ifsc || '—'}</td>
                    <td>{b.branch || '—'}</td>
                    <td>{phone ? <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', fontWeight: 600, fontSize: 12 }}>📱 {phone}</a> : <span style={{ color: 'var(--mid)', fontSize: 12 }}>—</span>}</td>
                    <td className="amt amt-green">{fmt(emp?.salary || 0)}</td>
                    <td>
                      <div className="flex-gap">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirm(b.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No bank records</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Bank Account' : 'Edit Bank Account'} onClose={() => setModal(null)} onSave={save}>
          <div className="form-grid cols2">
            <Field label="Employee" style={{ gridColumn: '1/-1' }}>
              <select 
                className="form-input" 
                value={form.name} 
                onChange={e => {
                  const selName = e.target.value
                  const foundEmp = emps.find(x => x.name === selName)
                  setForm(f => ({ ...f, name: selName, phone: foundEmp?.phone || f.phone }))
                }}
              >
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Bank Name"><input className="form-input" value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} /></Field>
            <Field label="Account Number"><input className="form-input" value={form.acc} onChange={e => setForm(f => ({ ...f, acc: e.target.value }))} /></Field>
            <Field label="IFSC Code"><input className="form-input" value={form.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value }))} /></Field>
            <Field label="Branch"><input className="form-input" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} /></Field>
            <Field label="📱 WhatsApp (10 digits)" style={{ gridColumn: '1/-1' }}>
              <input type="tel" className="form-input" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </Field>
          </div>
        </Modal>
      )}
      {confirm && <Confirm message={`Delete bank record for ${confirm}?`} onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}

// ── Change Password ───────────────────────────────────────────────
export function ChangePassword() {
  const [form, setForm] = useState({ cur: '', new: '', conf: '' })
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const changePw = async () => {
    setError('')
    if (form.new.length < 6) { setError('❌ Min 6 characters'); return }
    if (form.new !== form.conf) { setError('❌ Passwords do not match'); return }
    
    setUpdating(true)
    const { error: supaErr } = await supabase.auth.updateUser({ password: form.new })
    setUpdating(false)

    if (supaErr) {
      setError(`❌ ${supaErr.message}`)
    } else {
      toast.success('Password updated successfully ✅')
      setForm({ cur: '', new: '', conf: '' })
    }
  }

  return (
    <Layout title="🔑 Change Password">
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Panel title="🔑 Change Your Password" subtitle="Security settings">
          <div className="form-grid" style={{ gap: 16 }}>
            <Field label="New Password"><input type="password" className="form-input" value={form.new} onChange={e => setForm(f => ({ ...f, new: e.target.value }))} placeholder="Min 6 characters" /></Field>
            <Field label="Confirm New Password"><input type="password" className="form-input" value={form.conf} onChange={e => setForm(f => ({ ...f, conf: e.target.value }))} /></Field>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button className="btn btn-primary mt-16" onClick={changePw} disabled={updating}>
            {updating ? 'Updating...' : '✅ Update Password'}
          </button>
        </Panel>
        
        <div style={{ background: 'var(--grey)', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: 'var(--mid)', marginTop: 16 }}>
          <strong style={{ color: 'var(--navy)' }}>💡 Note:</strong> User management (adding/removing staff) is now handled securely via the **Supabase Dashboard** to ensure maximum data protection.
        </div>
      </div>
    </Layout>
  )
}
