import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'
import { BRAND } from '../config/branding'
import { motion } from 'framer-motion'
import { UserPlus, Calendar, Info, Search, Contact, CreditCard } from 'lucide-react'

export default function Employees() {
  const [emps, setEmps] = useState([])
  const [wd, setWd] = useState(26)
  const [wdInput, setWdInput] = useState(26)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ 
    name: '', salary: '', salaryType: 'weekly', 
    empId: '', identityNo: '', joiningDate: '', 
    relievingDate: '', phone: '', address: '' 
  })
  const [activeTab, setActiveTab] = useState('weekly')

  const load = useCallback(async () => {
    const [e, w] = await Promise.all([DB.employees(), DB.getWorkingDays()])
    setEmps(e); setWd(w); setWdInput(w); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const weeklyList  = emps.filter(e => e.salary_type === 'weekly' || !e.salary_type)
  const monthlyList = emps.filter(e => e.salary_type === 'monthly')
  const displayList = (activeTab === 'weekly' ? weeklyList : monthlyList)
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.emp_id?.toLowerCase().includes(search.toLowerCase()))

  const openAdd = async () => {
    const nextId = await DB.getNextEmpId(BRAND.shortName)
    setForm({ 
      name: '', salary: '', salaryType: activeTab, 
      empId: nextId, identityNo: '', 
      joiningDate: new Date().toISOString().split('T')[0], 
      relievingDate: '', phone: '', address: '' 
    })
    setModal({ type: 'add' })
  }

  const openEdit = emp => {
    setForm({ 
      name: emp.name, salary: emp.salary, 
      salaryType: emp.salary_type || 'weekly',
      empId: emp.emp_id || '', 
      identityNo: emp.identity_no || '',
      joiningDate: emp.joining_date || '',
      relievingDate: emp.relieving_date || '',
      phone: emp.phone || '',
      address: emp.address || ''
    })
    setModal({ type: 'edit', emp })
  }

  const save = async () => {
    const name = form.name.trim().toUpperCase()
    const salary = Number(form.salary)
    if (!name || !salary) { toast.error('Name and salary required'); return }
    
    const payload = { 
      ...form, 
      id: modal.type === 'add' ? uid() : modal.emp.id,
      name 
    }

    if (modal.type === 'add') {
      await DB.saveEmployee(payload)
      toast.success('Employee added ✅')
    } else {
      await DB.updateEmployee(payload)
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
      {/* Modern Working Days Control (Zoho Style) */}
      <Panel title="Payroll Configuration" subtitle="Global working days setting for rate calculation">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'var(--blue-light)', color: 'var(--blue)', width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={32} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>Current Period</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)', letterSpacing: -1 }}>{wd} Working Days</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--grey)', padding: '12px 16px', borderRadius: 16, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>Change to:</span>
            <input type="number" min={1} max={31} value={wdInput}
              onChange={e => setWdInput(Number(e.target.value))}
              className="form-input"
              style={{ width: 80, height: 40, textAlign: 'center', borderRadius: 10 }} />
            <button className="btn btn-blue" style={{ height: 40, padding: '0 20px', borderRadius: 10 }} onClick={async () => {
              await DB.setWorkingDays(wdInput)
              setWd(wdInput)
              toast.success(`Working days updated to ${wdInput}`)
            }}>Update</button>
          </div>
        </div>
      </Panel>

      {/* Tabs (Zoho Style) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, gap: 32 }}>
        {[
          { id: 'weekly', label: 'Weekly Employees', count: weeklyList.length },
          { id: 'monthly', label: 'Monthly Employees', count: monthlyList.length }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--blue)' : 'var(--slate)',
              borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
              fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {tab.label}
            <span style={{ fontSize: 11, background: activeTab === tab.id ? 'var(--blue)' : 'var(--border)', color: activeTab === tab.id ? '#fff' : 'var(--slate)', padding: '2px 8px', borderRadius: 10 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', opacity: 0.4 }} />
          <input 
            placeholder={`Search by name or ID...`} 
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
                <th>ID</th>
                <th>Employee Name</th>
                <th>Payment Type</th>
                <th>Base Salary</th>
                <th>Joined On</th>
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
                  <td style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{e.emp_id || 'N/A'}</td>
                  <td><strong style={{ fontSize: 14, fontWeight: 700 }}>{e.name}</strong></td>
                  <td>
                    <span className={`badge ${e.salary_type === 'monthly' ? 'badge-blue' : 'badge-green'}`}>
                      {e.salary_type === 'monthly' ? '🗓️ Monthly' : '📅 Weekly'}
                    </span>
                  </td>
                  <td className="amt amt-blue" style={{ fontSize: 15 }}>{fmt(e.salary)}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{e.joining_date || '—'}</td>
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: 60 }}>
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
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue)', marginBottom: 16 }}>
                <CreditCard size={18} />
                <h4 style={{ fontSize: 14, fontWeight: 800 }}>PAYROLL INFORMATION</h4>
              </div>
              <div className="form-grid cols2">
                <Field label="Employee ID">
                  <input value={form.empId} readOnly className="form-input" style={{ background: 'var(--bg)', opacity: 0.7 }} />
                </Field>
                <Field label="Salary Classification">
                  <select value={form.salaryType} onChange={e => setForm(f => ({ ...f, salaryType: e.target.value }))} className="form-input">
                    <option value="weekly">Weekly Payment</option>
                    <option value="monthly">Monthly Payment</option>
                  </select>
                </Field>
              </div>
              <div className="form-grid cols2" style={{ marginTop: 20 }}>
                <Field label="Full Name">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CAPS" className="form-input" />
                </Field>
                <Field label="Monthly Base Salary (₹)">
                  <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} className="form-input" />
                </Field>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--indigo)', marginBottom: 16 }}>
                <Contact size={18} />
                <h4 style={{ fontSize: 14, fontWeight: 800 }}>PERSONAL DETAILS</h4>
              </div>
              <div className="form-grid cols2">
                <Field label="National Identity (Aadhaar/PAN)">
                  <input value={form.identityNo} onChange={e => setForm(f => ({ ...f, identityNo: e.target.value }))} className="form-input" />
                </Field>
                <Field label="Phone Number">
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="form-input" />
                </Field>
              </div>
              <div className="form-grid cols2" style={{ marginTop: 20 }}>
                <Field label="Date of Joining">
                  <input type="date" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} className="form-input" />
                </Field>
                <Field label="Date of Relieving (If Any)">
                  <input type="date" value={form.relievingDate} onChange={e => setForm(f => ({ ...f, relievingDate: e.target.value }))} className="form-input" />
                </Field>
              </div>
              <Field label="Residential Address" style={{ marginTop: 20 }}>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="form-input" rows={2} style={{ resize: 'none' }} />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {confirm && <Confirm message="Are you sure you want to remove this employee from the directory? This action cannot be undone." onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
