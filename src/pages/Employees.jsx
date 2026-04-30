import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid, isMonthlyEmp } from '../lib/db'
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
  const [form, setForm] = useState({ name: '', salary: '', salaryType: 'weekly' })
  const [activeTab, setActiveTab] = useState('weekly') // 'weekly' | 'monthly'

  const load = useCallback(async () => {
    const [e, w] = await Promise.all([DB.employees(), DB.getWorkingDays()])
    setEmps(e); setWd(w); setWdInput(w); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const weeklyList  = emps.filter(e => !isMonthlyEmp(e.name))
  const monthlyList = emps.filter(e => isMonthlyEmp(e.name))
  const displayList = (activeTab === 'weekly' ? weeklyList : monthlyList)
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  const weeklyTotal  = weeklyList.reduce((s, e) => s + Number(e.salary), 0)
  const monthlyTotal = monthlyList.reduce((s, e) => s + Number(e.salary), 0)

  const saveWD = async () => {
    if (!wdInput || wdInput < 1 || wdInput > 31) { toast.error('Enter 1–31'); return }
    await DB.setWorkingDays(wdInput)
    setWd(wdInput)
    toast.success(`Working days updated to ${wdInput}`)
  }

  const openAdd = () => {
    setForm({ name: '', salary: '', salaryType: activeTab })
    setModal({ type: 'add' })
  }
  const openEdit = emp => {
    setForm({ name: emp.name, salary: emp.salary, salaryType: isMonthlyEmp(emp.name) ? 'monthly' : 'weekly' })
    setModal({ type: 'edit', emp })
  }

  const save = async () => {
    const name = form.name.trim().toUpperCase()
    const salary = Number(form.salary)
    if (!name || !salary) { toast.error('Name and salary required'); return }
    if (modal.type === 'add') {
      await DB.saveEmployee({ id: uid(), name, salary, salaryType: form.salaryType })
      toast.success('Employee added ✅')
    } else {
      await DB.updateEmployee({ id: modal.emp.id, name, salary, salaryType: form.salaryType })
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all .2s', ...(activeTab === 'weekly' ? { background: 'var(--navy)', border: '2px solid var(--navy)' } : {}) }} onClick={() => setActiveTab('weekly')}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: activeTab === 'weekly' ? 'rgba(255,255,255,.7)' : 'var(--blue)', marginBottom: 4 }}>📅 Weekly Salary Employees</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: activeTab === 'weekly' ? '#fff' : 'var(--navy)', fontFamily: 'var(--mono)' }}>{weeklyList.length}</div>
          <div style={{ fontSize: 12, color: activeTab === 'weekly' ? 'rgba(255,255,255,.6)' : 'var(--mid)', marginTop: 2 }}>Total: {fmt(weeklyTotal)}</div>
        </div>
        <div style={{ background: '#fdf4ff', border: '2px solid #e9d5ff', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all .2s', ...(activeTab === 'monthly' ? { background: '#7c3aed', border: '2px solid #7c3aed' } : {}) }} onClick={() => setActiveTab('monthly')}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: activeTab === 'monthly' ? 'rgba(255,255,255,.7)' : '#7c3aed', marginBottom: 4 }}>🗓️ Monthly Salary Employees</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: activeTab === 'monthly' ? '#fff' : '#7c3aed', fontFamily: 'var(--mono)' }}>{monthlyList.length}</div>
          <div style={{ fontSize: 12, color: activeTab === 'monthly' ? 'rgba(255,255,255,.6)' : 'var(--mid)', marginTop: 2 }}>Total: {fmt(monthlyTotal)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input placeholder={`Search ${activeTab} employees...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-gap">
          <span style={{ fontSize: 12, color: 'var(--mid)' }}>Showing: </span>
          <span style={{ fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>{fmt(activeTab === 'weekly' ? weeklyTotal : monthlyTotal)}</span>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      <Panel title={activeTab === 'weekly' ? '📅 Weekly Salary Employees' : '🗓️ Monthly Salary Employees'} noPad
        subtitle={`${displayList.length} employees · ${wd} working days this month`}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Monthly Salary</th>
                <th>Per Day (this month)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map(e => (
                <tr key={e.id}>
                  <td><strong style={{ fontSize: 12, color: 'var(--navy)' }}>{e.name}</strong></td>
                  <td>
                    {isMonthlyEmp(e.name)
                      ? <span style={{ background: '#f3e8ff', color: '#7c3aed', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>🗓️ Monthly</span>
                      : <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>📅 Weekly</span>
                    }
                  </td>
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
              {!displayList.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--mid)' }}>No employees found</td></tr>}
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
            <Field label="Salary Type">
              <select value={form.salaryType} onChange={e => setForm(f => ({ ...f, salaryType: e.target.value }))}>
                <option value="weekly">📅 Weekly (weekly entry)</option>
                <option value="monthly">🗓️ Monthly (monthly entry)</option>
              </select>
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
