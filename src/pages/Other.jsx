// ── Advances Page ────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, fmtDate, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'

export function Advances() {
  const [advances, setAdvances] = useState([])
  const [weekly, setWeekly] = useState([])
  const [emps, setEmps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), name: '', amount: '', remarks: '' })

  const load = useCallback(async () => {
    const [a, w, e] = await Promise.all([DB.advances(), DB.weekly(), DB.employees()])
    setAdvances(a); setWeekly(w); setEmps(e); setLoading(false)
    if (e.length && !form.name) setForm(f => ({ ...f, name: e[0].name }))
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = advances.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))
  const total = advances.reduce((s, a) => s + Number(a.amount), 0)
  const totalPend = emps.reduce((s, e) => s + DB.advPending(e.name, advances, weekly), 0)

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
                const ded = DB.totalAdvDeducted(a.name, weekly)
                const pend = DB.advPending(a.name, advances, weekly)
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
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Employee">
              <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)"><input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 2000" /></Field>
            <Field label="Remarks"><input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Medical" /></Field>
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
  const [emps, setEmps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), name: '', amount: '', remarks: '' })

  const load = useCallback(async () => {
    const [s, w, e] = await Promise.all([DB.shortages(), DB.weekly(), DB.employees()])
    setShortages(s); setWeekly(w); setEmps(e); setLoading(false)
    if (e.length && !form.name) setForm(f => ({ ...f, name: e[0].name }))
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = shortages.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))
  const total = shortages.reduce((s, a) => s + Number(a.amount), 0)
  const totalPend = emps.reduce((s, e) => s + DB.shrPending(e.name, shortages, weekly), 0)

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
                const pend = DB.shrPending(a.name, shortages, weekly)
                return (
                  <tr key={a.id}>
                    <td>{fmtDate(a.date)}</td>
                    <td><strong style={{ fontSize: 12 }}>{a.name}</strong></td>
                    <td className="amt amt-red">{fmt(a.amount)}</td>
                    <td className="amt amt-red">{fmt(DB.totalShrDeducted(a.name, weekly))}</td>
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
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Employee">
              <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)"><input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
            <Field label="Remarks"><input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Material damage" /></Field>
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
  useEffect(() => {
    Promise.all([DB.employees(), DB.advances(), DB.shortages(), DB.weekly()])
      .then(([emps, advances, shortages, weekly]) => setData({ emps, advances, shortages, weekly }))
  }, [])

  if (!data) return <Layout title="📋 Deduction Master"><Spinner /></Layout>
  const { emps, advances, shortages, weekly } = data

  return (
    <Layout title="📋 Deduction Master">
      <div style={{ background: 'var(--yellow)', borderRadius: 10, padding: '12px 18px', marginBottom: 18, fontSize: 13 }}>
        📌 Fully automatic — calculated from Advance Log, Shortage Log and Weekly Entry.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Panel title="💰 Advance Summary" noPad>
          <div className="tbl-wrap">            <table>
              <thead><tr><th>Employee</th><th>Given</th><th>Deducted</th><th>Pending</th></tr></thead>
              <tbody>
                {emps.map(e => {
                  const g = DB.totalAdvGiven(e.name, advances), d = DB.totalAdvDeducted(e.name, weekly), p = g - d
                  return <tr key={e.id}><td><strong style={{ fontSize: 12 }}>{e.name}</strong></td><td className="amt amt-blue">{fmt(g)}</td><td className="amt">{fmt(d)}</td><td className={`amt ${p > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(p)}</td></tr>
                })}
                <tr style={{ background: 'var(--navy)', color: '#fff', fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td className="amt" style={{ color: '#7dd3fc', fontFamily: 'var(--mono)' }}>{fmt(emps.reduce((s,e)=>s+DB.totalAdvGiven(e.name,advances),0))}</td>
                  <td className="amt" style={{ fontFamily: 'var(--mono)' }}>{fmt(emps.reduce((s,e)=>s+DB.totalAdvDeducted(e.name,weekly),0))}</td>
                  <td className="amt" style={{ color: '#86efac', fontFamily: 'var(--mono)' }}>{fmt(emps.reduce((s,e)=>s+DB.advPending(e.name,advances,weekly),0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="⚠️ Shortage Summary" headerColor="var(--red)" noPad>
          <div className="tbl-wrap">            <table>
              <thead><tr><th>Employee</th><th>Total</th><th>Deducted</th><th>Pending</th></tr></thead>
              <tbody>
                {emps.map(e => {
                  const g = DB.totalShrGiven(e.name, shortages), d = DB.totalShrDeducted(e.name, weekly), p = g - d
                  return <tr key={e.id}><td><strong style={{ fontSize: 12 }}>{e.name}</strong></td><td className="amt amt-red">{fmt(g)}</td><td className="amt">{fmt(d)}</td><td className={`amt ${p > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(p)}</td></tr>
                })}
                <tr style={{ background: 'var(--red)', color: '#fff', fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td className="amt" style={{ color: '#fca5a5', fontFamily: 'var(--mono)' }}>{fmt(emps.reduce((s,e)=>s+DB.totalShrGiven(e.name,shortages),0))}</td>
                  <td className="amt" style={{ fontFamily: 'var(--mono)' }}>{fmt(emps.reduce((s,e)=>s+DB.totalShrDeducted(e.name,weekly),0))}</td>
                  <td className="amt" style={{ color: '#bbf7d0', fontFamily: 'var(--mono)' }}>{fmt(emps.reduce((s,e)=>s+DB.shrPending(e.name,shortages,weekly),0))}</td>
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

  const openAdd  = () => { setForm({ name: emps[0]?.name || '', bank: 'SBI', acc: '', ifsc: '', branch: 'Erode', phone: '' }); setModal('add') }
  const openEdit = b => { setForm({ ...b }); setModal('edit') }

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
              {filtered.map(b => (
                <tr key={b.name}>
                  <td><strong style={{ fontSize: 12 }}>{b.name}</strong></td>
                  <td><span className="badge badge-blue">{b.bank || '—'}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{b.acc || '—'}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{b.ifsc || '—'}</td>
                  <td>{b.branch || '—'}</td>
                  <td>{b.phone ? <a href={`https://wa.me/91${b.phone}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', fontWeight: 600, fontSize: 12 }}>📱 {b.phone}</a> : <span style={{ color: 'var(--mid)', fontSize: 12 }}>—</span>}</td>
                  <td className="amt amt-green">{fmt(emps.find(e => e.name === b.name)?.salary || 0)}</td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(b.name)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No bank records</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Bank Account' : 'Edit Bank Account'} onClose={() => setModal(null)} onSave={save}>
          <div className="form-grid cols2">
            <Field label="Employee" style={{ gridColumn: '1/-1' }}>
              <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                {emps.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Bank Name"><input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} /></Field>
            <Field label="Account Number"><input value={form.acc} onChange={e => setForm(f => ({ ...f, acc: e.target.value }))} /></Field>
            <Field label="IFSC Code"><input value={form.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value }))} /></Field>
            <Field label="Branch"><input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} /></Field>
            <Field label="📱 WhatsApp (10 digits)" style={{ gridColumn: '1/-1' }}>
              <input type="tel" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
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
  const [newUserForm, setNewUserForm] = useState(false)
  const [nuForm, setNuForm] = useState({ username: '', password: '', role: 'staff' })
  const [users, setUsers] = useState(DB.getUsers())
  const sess = (() => { try { return JSON.parse(sessionStorage.getItem('prl_session')) || {} } catch { return {} } })()

  const changePw = () => {
    setError('')
    const allUsers = DB.getUsers()
    const me = allUsers.find(u => u.username === (sess.username || 'admin'))
    if (!me || me.password !== btoa(form.cur)) { setError('❌ Current password incorrect'); return }
    if (form.new.length < 6) { setError('❌ Min 6 characters'); return }
    if (form.new !== form.conf) { setError('❌ Passwords do not match'); return }
    me.password = btoa(form.new)
    DB.saveUsers(allUsers)
    toast.success('Password changed ✅')
    setForm({ cur: '', new: '', conf: '' })
  }

  const addUser = () => {
    if (!nuForm.username) { toast.error('Username required'); return }
    if (nuForm.password.length < 6) { toast.error('Min 6 chars'); return }
    const allUsers = DB.getUsers()
    if (allUsers.find(u => u.username === nuForm.username)) { toast.error('Username exists'); return }
    allUsers.push({ username: nuForm.username, password: btoa(nuForm.password), role: nuForm.role })
    DB.saveUsers(allUsers)
    setUsers(DB.getUsers())
    setNewUserForm(false)
    toast.success(`User "${nuForm.username}" added ✅`)
  }

  const removeUser = name => {
    DB.saveUsers(DB.getUsers().filter(u => u.username !== name))
    setUsers(DB.getUsers())
    toast.error(`User "${name}" removed`)
  }

  return (
    <Layout title="🔑 Change Password">
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Panel title="🔑 Change Your Password" subtitle={`Logged in as: ${sess.username || 'admin'}`}>
          <div className="form-grid" style={{ gap: 16 }}>
            <Field label="Current Password"><input type="password" value={form.cur} onChange={e => setForm(f => ({ ...f, cur: e.target.value }))} /></Field>
            <Field label="New Password"><input type="password" value={form.new} onChange={e => setForm(f => ({ ...f, new: e.target.value }))} placeholder="Min 6 characters" /></Field>
            <Field label="Confirm New Password"><input type="password" value={form.conf} onChange={e => setForm(f => ({ ...f, conf: e.target.value }))} /></Field>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
          <button className="btn btn-primary mt-16" onClick={changePw}>✅ Update Password</button>
        </Panel>

        <Panel title="👥 Manage Users" headerColor="var(--blue)">
          {users.map(u => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 8, background: 'var(--grey)', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>👤 {u.username}</span>
                <span className="badge badge-blue" style={{ marginLeft: 8 }}>{u.role || 'staff'}</span>
              </div>
              {u.username !== (sess.username || 'admin')
                ? <button className="btn btn-danger btn-sm" onClick={() => removeUser(u.username)}>🗑️ Remove</button>
                : <span style={{ fontSize: 11, color: 'var(--mid)' }}>Current user</span>}
            </div>
          ))}
          <button className="btn btn-primary btn-sm" onClick={() => setNewUserForm(true)}>+ Add New User</button>
        </Panel>
      </div>

      {newUserForm && (
        <Modal title="Add New User" onClose={() => setNewUserForm(false)} onSave={async () => { addUser(); }}>
          <div className="form-grid" style={{ gap: 14 }}>
            <Field label="Username"><input value={nuForm.username} onChange={e => setNuForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. staff1" /></Field>
            <Field label="Password"><input type="password" value={nuForm.password} onChange={e => setNuForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 chars" /></Field>
            <Field label="Role">
              <select value={nuForm.role} onChange={e => setNuForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
