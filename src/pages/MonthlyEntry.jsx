import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Download, FileText, Lock, 
  Trash2, Plus, Zap, AlertTriangle, Search
} from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const REMITTER_ACC   = '33284893641'
const REMITTER_NAME  = 'THULIR AGENCY'
const REMITTER_ADDR  = 'ERODE'
const REMITTER_EMAIL = 'sbi.12777@sbi.co.in'

function downloadMonthlyBankFile(label, entries, emps, bankList) {
  const sbiRows = [], otherRows = []
  entries.forEach((m, idx) => {
    const emp    = emps.find(e => e.name === m.name)
    const bank   = bankList.find(b => b.name === m.name) || {}
    const salary = Math.round(DB.monthlySalary(m, emp))
    if (!bank.acc || salary <= 0) return
    const refNo = `THULIRSAL${String(idx + 1).padStart(6, '0')}`
    if (bank.bank && bank.bank.toUpperCase() === 'SBI') {
      sbiRows.push([m.name, bank.acc, bank.ifsc || '', salary])
    } else {
      otherRows.push([REMITTER_ACC, REMITTER_NAME, REMITTER_ADDR, bank.acc, m.name, REMITTER_ADDR, bank.ifsc || '', 'SAL', 'ATTN', REMITTER_EMAIL, refNo, salary])
    }
  })
  const sbiTotal    = sbiRows.reduce((s, r) => s + r[3], 0)
  const sbiCsvRows  = [['ACCOUNT HOLDER NAME','ACCOUNT NUMBER','IFSC CODE','NET SALERY'], ...sbiRows, ['','','TOTAL', sbiTotal]]
  const otherCsvRows = [['RemitterAcno','RemitterName','RemitterAddress','BenificiaryAcno','BenificiaryName','BenificiaryAddress','BenificiaryIFSC','PaymentDetails','Sender to Receiver Code','RemitterEmail','RefNo','Amount'], ...otherRows]
  const toCSV = rows => rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
  const bom = '\uFEFF'
  const slug = label.replace(/\s+/g, '-')
  const dl = (csv, name) => { const b = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u) }
  dl(toCSV(sbiCsvRows), `${slug}-Monthly-SBI.csv`)
  setTimeout(() => dl(toCSV(otherCsvRows), `${slug}-Monthly-OtherBank.csv`), 800)
  return { sbiCount: sbiRows.length, otherCount: otherRows.length }
}

function downloadMonthlyExcel(label, entries, emps) {
  const rows = [['THULIR AGENCY — MONTHLY PAYROLL'], [label], [`Generated: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}`], [], ['S.No','Employee Name','Gross Salary (₹)','Adv Deducted','Shr Deducted','Net Salary (₹)']]
  let total = 0
  entries.forEach((m, i) => {
    const emp = emps.find(e => e.name === m.name)
    const net = Math.round(DB.monthlySalary(m, emp))
    total += net
    rows.push([i+1, m.name, emp?.salary || 0, m.adv_deducted || 0, m.shr_deducted || 0, net])
  })
  rows.push([], ['','','','','TOTAL', total])
  const blob = new Blob(['\uFEFF' + rows.map(r => r.map(v => `"${v??''}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${label.replace(/\s+/g,'-')}-Monthly-Payroll.csv`; a.click()
}

function InlineCell({ value, onSave, color }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  useEffect(() => { setVal(value) }, [value])
  const commit = () => { setEditing(false); const num = Number(val); if (num !== value) onSave(num) }
  if (editing) return <input type="number" min={0} value={val} autoFocus onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setVal(value); setEditing(false) } }} style={{ width:68, height:32, textAlign:'center', border:'2px solid var(--blue)', borderRadius:8, fontFamily:'var(--mono)', fontSize:13, fontWeight:700, outline:'none', background:'#fff' }} />
  return <span onClick={() => setEditing(true)} style={{ cursor:'pointer', fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:color||'var(--navy)', padding:'6px 12px', borderRadius:8, display:'inline-block', border:'1px dashed #cbd5e1', transition:'all .2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--bg)' }} onMouseLeave={e => { e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.background='transparent' }}>{value}</span>
}

export function Monthly() {
  const [allMonthly, setAllMonthly]     = useState([])
  const [emps, setEmps]                 = useState([])
  const [advances, setAdvances]         = useState([])
  const [shortages, setShortages]       = useState([])
  const [bankList, setBankList]         = useState([])
  const [activePeriod, setActivePeriod] = useState(null)
  const [wd, setWd]                     = useState(26)
  const [loading, setLoading]           = useState(true)
  const [confirm, setConfirm]           = useState(null)
  const [search, setSearch]             = useState('')
  const [bulkModal, setBulkModal]       = useState(false)
  const [bulkForm, setBulkForm]         = useState({ daysWorked:26, leaves:0, advDeducted:0, shrDeducted:0 })
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saving, setSaving]             = useState(null)
  const [allMonthlyHist, setAllMonthlyHist] = useState([])
  const [adding, setAdding]             = useState(new Set())
  const [closedData, setClosedData]     = useState(null)

  const now = new Date()
  const [newPeriod, setNewPeriod] = useState({ month: now.getMonth(), year: now.getFullYear(), label: '', dateFrom: '', dateTo: '' })

  useEffect(() => {
    const { month, year } = newPeriod
    const pad = n => String(n).padStart(2,'0')
    const lastDay = new Date(year, month + 1, 0).getDate()
    setNewPeriod(p => ({ ...p, dateFrom:`${year}-${pad(month+1)}-01`, dateTo:`${year}-${pad(month+1)}-${pad(lastDay)}`, label:`${MONTHS[month]} ${year}` }))
  }, [newPeriod.month, newPeriod.year])

  const load = useCallback(async () => {
    const [allM, e, a, s, ap, b, wdays] = await Promise.all([DB.monthlyAll(), DB.employees(), DB.advances(), DB.shortages(), DB.openMonthlyPeriod(), DB.bank(), DB.getWorkingDays()])
    const monthlyEmps = e.filter(emp => emp.salary_type === 'monthly')
    setEmps(monthlyEmps); setAdvances(a); setShortages(s); setActivePeriod(ap); setBankList(b); setWd(wdays); setAllMonthlyHist(allM)
    if (ap) setAllMonthly(allM.filter(x => x.period_id === ap.id))
    else setAllMonthly([])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    if (loading || !emps.length) return { empMap: {}, advMap: {}, shrMap: {}, dedMap: {}, pending: [], total: 0 }
    const empMap  = DB.createEmpMap(emps); const advMap  = DB.createAdvMap(advances); const shrMap  = DB.createAdvMap(shortages); const dedMap  = DB.createDedMap(allMonthlyHist)
    const enteredNames = new Set(allMonthly.map(m => m.name)); const pending = emps.filter(e => !enteredNames.has(e.name)); const total = allMonthly.reduce((s, m) => s + DB.monthlySalary(m, empMap[m.name], wd), 0)
    return { empMap, advMap, shrMap, dedMap, pending, total }
  }, [allMonthly, allMonthlyHist, emps, advances, shortages, wd, loading])

  const { empMap, advMap, shrMap, dedMap, pending: pendingEmps, total: totalPay } = stats
  const filtered = allMonthly.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))

  const inlineSave = async (entry, field, newVal) => {
    setAllMonthly(prev => prev.map(m => m.id === entry.id ? { ...m, [field]: newVal } : m))
    setSaving(entry.id)
    try {
      await DB.updateMonthly({ id: entry.id, name: entry.name, monthLabel: entry.month_label, date: entry.date, periodId: entry.period_id, daysWorked: field === 'days_worked' ? newVal : (entry.days_worked || 0), leaves: field === 'leaves' ? newVal : (entry.leaves || 0), advDeducted: field === 'adv_deducted' ? newVal : (entry.adv_deducted || 0), shrDeducted: field === 'shr_deducted' ? newVal : (entry.shr_deducted || 0) })
      toast.success('Saved', { duration: 800 })
    } catch (err) { toast.error('Failed'); load() } finally { setSaving(null) }
  }

  const quickAdd = async emp => {
    if (adding.has(emp.name)) return
    setAdding(prev => new Set([...prev, emp.name]))
    try {
      await DB.saveMonthly({ id:uid(), name:emp.name, monthLabel:activePeriod.label, date:activePeriod.date_from, daysWorked:wd, leaves:0, advDeducted:0, shrDeducted:0, periodId:activePeriod.id })
      load()
    } catch (err) { toast.error('Failed') } finally { setAdding(prev => { const n = new Set(prev); n.delete(emp.name); return n }) }
  }

  const startPeriod = async () => {
    if (!newPeriod.dateFrom || !newPeriod.dateTo) { toast.error('Select dates'); return }
    await DB.saveMonthlyPeriod({ id:uid(), label:newPeriod.label, month_name:newPeriod.label, date_from:newPeriod.dateFrom, date_to:newPeriod.dateTo, status:'open' })
    toast.success(`✅ "${newPeriod.label}" started!`); load()
  }

  const closePayroll = async () => {
    await DB.closeMonthlyPeriod(activePeriod.id, totalPay)
    downloadMonthlyExcel(activePeriod.label, [...allMonthly], [...emps])
    setTimeout(() => downloadMonthlyBankFile(activePeriod.label, [...allMonthly], [...emps], bankList), 600)
    setClosedData({ label: activePeriod.label, entries: [...allMonthly], allEmps: [...emps] }); setCloseConfirm(false); setActivePeriod(null); load()
  }

  if (loading) return <Layout title="Monthly Entry"><Spinner /></Layout>

  if (!activePeriod) {
    return (
      <Layout title="Monthly Entry">
        <AnimatePresence>
          {closedData && (
            <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ background: 'var(--white)', border: '1px solid var(--blue)', borderLeft: '6px solid var(--blue)', borderRadius: 16, padding: '24px 32px', marginBottom: 32, boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--blue)', marginBottom: 4 }}>✅ Monthly Period Closed</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{closedData.label}</div>
                </div>
                <button className="btn" style={{ background: 'var(--grey)', color: 'var(--slate)', border: 'none' }} onClick={() => setClosedData(null)}>Dismiss</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Panel title="Initialize Monthly Payroll" subtitle={`Managing ${emps.length} staff members`}>
            <div className="form-grid cols2" style={{ marginBottom: 24 }}>
              <Field label="Month"><select className="form-input" value={newPeriod.month} onChange={e => setNewPeriod(p => ({ ...p, month:Number(e.target.value) }))}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select></Field>
              <Field label="Year"><select className="form-input" value={newPeriod.year} onChange={e => setNewPeriod(p => ({ ...p, year:Number(e.target.value) }))}>{[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}</select></Field>
            </div>
            <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
              <strong style={{ fontSize: 18, color: 'var(--navy)' }}>{newPeriod.label}</strong>
              <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>Full month processing cycle</div>
            </div>
            <button className="btn btn-blue" style={{ width: '100%', padding: '16px', justifyContent: 'center' }} onClick={startPeriod}>
              Start Monthly Payroll Cycle
            </button>
          </Panel>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Monthly Payroll Processing">
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 24, padding: '32px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--blue)', letterSpacing: 1.5 }}>Active Monthly Period</div>
          <div style={{ fontSize: 28, fontWeight: 800, margin: '4px 0', color: 'var(--navy)' }}>{activePeriod.label}</div>
          <div style={{ color: 'var(--slate)', opacity: 0.7, fontSize: 14, fontWeight: 500 }}>{allMonthly.length} / {emps.length} Staff Processed</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {pendingEmps.length > 0 && <button className="btn" style={{ background: 'var(--grey)', color: 'var(--navy)', border: 'none' }} onClick={() => setBulkModal(true)}><Zap size={16}/> Bulk Add</button>}
          <button className="btn" style={{ background: 'var(--rose-light)', color: 'var(--rose)', border: 'none' }} onClick={() => setCloseConfirm(true)}><Lock size={16}/> Finalize Month</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input placeholder="Search monthly staff..." className="form-input" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 48 }} />
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', opacity: 0.4 }} />
      </div>

      <Panel noPad subtitle={`Recalculating based on ${wd} base working days`}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Staff Member</th><th>Gross</th><th style={{ textAlign:'center' }}>Days</th><th style={{ textAlign:'center' }}>Leaves</th><th style={{ textAlign:'center' }}>Adv Ded</th><th style={{ textAlign:'center' }}>Shr Ded</th><th>Net Salary</th><th style={{ textAlign:'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ opacity: saving===m.id ? 0.4 : 1 }}>
                  <td><strong style={{ fontSize: 14 }}>{m.name}</strong></td>
                  <td className="amt amt-blue">{fmt(empMap[m.name]?.salary)}</td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(m.days_worked||0)} max={31} onSave={v => inlineSave(m,'days_worked',v)} /></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(m.leaves||0)} max={31} onSave={v => inlineSave(m,'leaves',v)} /></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(m.adv_deducted||0)} onSave={v => inlineSave(m,'adv_deducted',v)} color="var(--rose)" /></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(m.shr_deducted||0)} onSave={v => inlineSave(m,'shr_deducted',v)} color="var(--rose)" /></td>
                  <td className="amt amt-green" style={{ fontSize: 15 }}>{fmt(DB.monthlySalary(m, empMap[m.name], wd))}</td>
                  <td style={{ textAlign:'right' }}><button className="btn btn-sm btn-danger" onClick={() => setConfirm(m.id)}><Trash2 size={14}/></button></td>
                </tr>
              ))}
              {pendingEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())).map(e => (
                <tr key={e.id} style={{ background: '#fdf4ff' }}>
                  <td style={{ opacity: 0.5 }}>{e.name}</td>
                  <td className="amt" style={{ opacity: 0.5 }}>{fmt(e.salary)}</td>
                  <td colSpan={5} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--indigo)' }}>PENDING MONTHLY ENTRY</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sm" style={{ background: 'var(--indigo)', color: '#fff' }} onClick={() => quickAdd(e)}>+ Quick Add</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {bulkModal && (
        <Modal title="⚡ Bulk Monthly Entry" onClose={() => setBulkModal(false)} onSave={bulkAdd} saveLabel={`Apply to ${pendingEmps.length} Staff`}>
          <div className="form-grid cols2">
            <Field label="Standard Days"><input type="number" className="form-input" value={bulkForm.daysWorked} onChange={e => setBulkForm(f => ({ ...f, daysWorked:Number(e.target.value) }))} /></Field>
            <Field label="Standard Leaves"><input type="number" className="form-input" value={bulkForm.leaves} onChange={e => setBulkForm(f => ({ ...f, leaves:Number(e.target.value) }))} /></Field>
          </div>
        </Modal>
      )}

      {closeConfirm && (
        <Confirm message={`Finalize payroll for ${activePeriod?.label}? This will archive the records and generate bank files.`} onConfirm={closePayroll} onClose={() => setCloseConfirm(false)} />
      )}

      {confirm && <Confirm message="Remove this monthly record?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
