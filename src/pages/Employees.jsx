import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'
import { motion } from 'framer-motion'
import { UserPlus, Calendar, Info, Search } from 'lucide-react'

export default function Employees() {
  const [emps, setEmps] = useState([])
  const [wd, setWd] = useState(26)
  const [wdInput, setWdInput] = useState(26)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', salary: '', salaryType: 'weekly' })
  const [activeTab, setActiveTab] = useState('weekly')

  const load = useCallback(async () => {
    const [e, w] = await Promise.all([DB.employees(), DB.getWorkingDays()])
    setEmps(e); setWd(w); setWdInput(w); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const weeklyList  = emps.filter(e => e.salary_type === 'weekly' || !e.salary_type)
  const monthlyList = emps.filter(e => e.salary_type === 'monthly')
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
    setForm({ name: emp.name, salary: emp.salary, salaryType: emp.salary_type || 'weekly' })
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

  if (loading) return <Layout title="Employee Master"><Spinner /></Layout>

  return (
    <Layout title="Staff Directory">
      {/* Modern Working Days Control */}
      <div style={{ background: 'linear-gradient(135deg, var(--navy), var(--indigo))', borderRadius: 24, padding: '32px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, boxShadow: 'var(--shadow-premium)', position: 'relative', overflow: 'hidden' }}>
        <Calendar style={{ position: 'absolute', right: -20, bottom: -20, size: 140, opacity: 0.05, color: '#fff' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Payroll Settings</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -2 }}>{wd}</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 500 }}>Active Working Days</span>
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', padding: '24px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Update Period</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Calculates per-day rates</div>
          </div>
          <input type="number" min={1} max={31} value={wdInput}
            onChange={e => setWdInput(Number(e.target.value))}
            style={{ width: 64, height: 48, textAlign: 'center', fontSize: 20, fontWeight: 800, borderRadius: 12, border: 'none', background: '#fff', color: 'var(--navy)' }} />
          <button className="btn btn-blue" style={{ height: 48, padding: '0 24px' }} onClick={saveWD}>Apply</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { id: 'weekly', label: 'Weekly Staff', count: weeklyList.length, color: 'var(--blue)' },
          { id: 'monthly', label: 'Monthly Staff', count: monthlyList.length, color: 'var(--indigo)' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              flex: 1, padding: '20px', borderRadius: 20, border: '2px solid transparent',
              background: activeTab === tab.id ? tab.color : 'var(--white)',
              color: activeTab === tab.id ? '#fff' : 'var(--navy)',
              boxShadow: activeTab === tab.id ? `0 10px 25px -5px ${tab.color}40` : 'var(--shadow-premium)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textAlign: 'left', cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, opacity: activeTab === tab.id ? 0.7 : 0.4, marginBottom: 4 }}>{tab.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>{tab.count}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', opacity: 0.4 }} />
          <input 
            placeholder={`Search ${activeTab} directory...`} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: 16, border: '1px solid var(--border)', background: '#fff', outline: 'none', fontSize: 14, fontWeight: 500 }}
          />
        </div>
        <button className="btn btn-blue" onClick={openAdd} style={{ padding: '14px 24px' }}>
          <UserPlus size={18} />
          <span>Add New Employee</span>
        </button>
      </div>

      <Panel noPad subtitle={`${displayList.length} staff members listed`}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Payment Type</th>
                <th>Base Salary</th>
                <th>Current Daily Rate</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((e, idx) => (
                <motion.tr 
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <td><strong style={{ fontSize: 14, fontWeight: 700 }}>{e.name}</strong></td>
                  <td>
                    <span className={`badge ${e.salary_type === 'monthly' ? 'badge-blue' : 'badge-green'}`}>
                      {e.salary_type === 'monthly' ? '🗓️ Monthly' : '📅 Weekly'}
                    </span>
                  </td>
                  <td className="amt amt-blue" style={{ fontSize: 15 }}>{fmt(e.salary)}</td>
                  <td className="amt" style={{ color: 'var(--slate)', opacity: 0.6 }}>{fmt((e.salary / wd).toFixed(2))}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" style={{ background: 'var(--bg)', color: 'var(--navy)', border: 'none' }} onClick={() => openEdit(e)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(e.id)}>Remove</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!displayList.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>🔍</div>
                    <p style={{ color: 'var(--slate)', opacity: 0.5, fontWeight: 600 }}>No employees found matching your search</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <Modal title={modal.type === 'add' ? 'Add New Staff' : 'Update Staff Record'} onClose={() => setModal(null)} onSave={save}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <Field label="Full Name">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter name in CAPS" className="form-input" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Monthly Base Salary (₹)">
                <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="e.g. 18000" className="form-input" />
              </Field>
              <Field label="Salary Classification">
                <select value={form.salaryType} onChange={e => setForm(f => ({ ...f, salaryType: e.target.value }))} className="form-input">
                  <option value="weekly">Weekly Payment</option>
                  <option value="monthly">Monthly Payment</option>
                </select>
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {confirm && <Confirm message="Are you sure you want to remove this employee from the directory? This action cannot be undone." onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
