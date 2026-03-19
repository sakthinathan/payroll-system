import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'

export default function Employees() {
  const [emps, setEmps] = useState([])
  const [wd, setWd] = useState(26)
  const [wdInput, setWdInput] = useState(26)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // {type:'add'|'edit', emp?}
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', salary: '' })

  const load = useCallback(async () => {
    const [e, w] = await Promise.all([DB.employees(), DB.getWorkingDays()])
    setEmps(e); setWd(w); setWdInput(w); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = emps.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  const total = emps.reduce((s, e) => s + Number(e.salary), 0)

  const saveWD = async () => {
    if (!wdInput || wdInput < 1 || wdInput > 31) { toast.error('Enter 1–31'); return }
    await DB.setWorkingDays(wdInput)
    setWd(wdInput)
    toast.success(`Working days updated to ${wdInput}`)
  }

  const openAdd = () => { setForm({ name: '', salary: '' }); setModal({ type: 'add' }) }
  const openEdit = emp => { setForm({ name: emp.name, salary: emp.salary }); setModal({ type: 'edit', emp }) }

  const save = async () => {
    const name = form.name.trim().toUpperCase()
    const salary = Number(form.salary)
    if (!name || !salary) { toast.error('Name and salary required'); return }
    if (modal.type === 'add') {
      await DB.saveEmployee({ id: uid(), name, salary })
      toast.success('Employee added ✅')
    } else {
      await DB.updateEmployee({ id: modal.emp.id, name, salary })
      toast.success('Saved ✅')
    }
    setModal(null)
    load()
  }

  const del = async id => {
    await DB.deleteEmployee(id)
    toast.error('Deleted')
    setConfirm(null)
    load()
  }

  if (loading) return <Layout title="👥 Employee Master"><Spinner /></Layout>

  return (
    <Layout title="👥 Employee Master">
      {/* Working Days Banner */}
      <div style={{ background: 'linear-gradient(135deg,var(--navy),var(--blue))', borderRadius: 14, padding: '20px 24px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>📅 This Month's Working Days</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', fontFamily: 'var(--mono)', lineHeight: 1 }}>{wd}</span>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>days · Per day salary updates automatically</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="number" min={1} max={31} value={wdInput}
            onChange={e => setWdInput(Number(e.target.value))}
            style={{ width: 72, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: 8, borderRadius: 8, border: 'none', fontFamily: 'var(--mono)' }} />
          <button className="btn" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }} onClick={saveWD}>✅ Update</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-gap">
          <span style={{ fontSize: 12, color: 'var(--mid)' }}>Total: </span>
          <span style={{ fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>{fmt(total)}</span>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      <Panel title="All Employees" noPad subtitle={`${emps.length} employees · ${wd} working days this month`}>
        <div className="tbl-wrap">          <table>
            <thead><tr><th>Name</th><th>Monthly Salary</th><th>Per Day (this month)</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td><strong style={{ fontSize: 12, color: 'var(--navy)' }}>{e.name}</strong></td>
                  <td className="amt amt-blue">{fmt(e.salary)}</td>
                  <td className="amt">{fmt((e.salary / wd).toFixed(2))}</td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(e.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--mid)' }}>No employees found</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <Modal title={modal.type === 'add' ? 'Add New Employee' : 'Edit Employee'} onClose={() => setModal(null)} onSave={save}>
          <div className="form-grid cols2">
            <Field label="Employee Name">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name in CAPS" />
            </Field>
            <Field label="Monthly Salary (₹)">
              <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="e.g. 18000" />
            </Field>
          </div>
        </Modal>
      )}

      {confirm && (
        <Confirm message="Delete this employee?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />
      )}
    </Layout>
  )
}
