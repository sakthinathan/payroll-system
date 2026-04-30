import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid, isMonthlyEmp } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'

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
  if (editing) return <input type="number" min={0} value={val} autoFocus onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setVal(value); setEditing(false) } }} style={{ width:80, textAlign:'center', padding:'4px 6px', border:'2px solid var(--blue)', borderRadius:6, fontFamily:'var(--mono)', fontSize:13, fontWeight:600, outline:'none', background:'#eff6ff' }} />
  return <span onClick={() => setEditing(true)} title="Click to edit" style={{ cursor:'pointer', fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:color||'inherit', padding:'4px 10px', borderRadius:6, display:'inline-block', border:'1.5px dashed transparent', transition:'all .15s', minWidth:48, textAlign:'center' }} onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='#eff6ff' }} onMouseLeave={e => { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='transparent' }}>{value}</span>
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
  const [tableError, setTableError]     = useState(false)
  const [confirm, setConfirm]           = useState(null)
  const [search, setSearch]             = useState('')
  const [bulkModal, setBulkModal]       = useState(false)
  const [bulkForm, setBulkForm]         = useState({ daysWorked:26, leaves:0, advDeducted:0, shrDeducted:0 })
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saving, setSaving]             = useState(null)
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
    try {
      const [w, e, a, s, ap, b, wdays] = await Promise.all([DB.monthlyAll(), DB.employees(), DB.advances(), DB.shortages(), DB.openMonthlyPeriod(), DB.bank(), DB.getWorkingDays()])
      const monthlyEmps = e.filter(emp => isMonthlyEmp(emp.name))
      const periodEntries = ap ? w.filter(x => x.period_id === ap.id) : []
      setAllMonthly(periodEntries); setEmps(monthlyEmps); setAdvances(a); setShortages(s); setActivePeriod(ap); setBankList(b); setWd(wdays)
      setTableError(false)
    } catch (err) {
      console.error('Monthly load error:', err)
      if (err.message && (err.message.includes('does not exist') || err.message.includes('relation') || err.message.includes('42P01'))) {
        setTableError(true)
      } else {
        toast.error('Load failed: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const enteredNames = new Set(allMonthly.map(m => m.name))
  const pendingEmps  = emps.filter(e => !enteredNames.has(e.name))
  const totalPay     = allMonthly.reduce((s, m) => s + DB.monthlySalary(m, emps.find(e => e.name === m.name), wd), 0)
  const filtered     = allMonthly.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))

  const inlineSave = async (entry, field, newVal) => {
    // Optimistic update — immediately reflect change in UI so salary recalculates instantly
    setAllMonthly(prev => prev.map(m => m.id === entry.id ? { ...m, [field]: newVal } : m))
    setSaving(entry.id)
    try {
      await DB.updateMonthly({
        id: entry.id, name: entry.name, monthLabel: entry.month_label, date: entry.date, periodId: entry.period_id,
        daysWorked:   field === 'days_worked'   ? newVal : (entry.days_worked   || 0),
        leaves:       field === 'leaves'        ? newVal : (entry.leaves        || 0),
        advDeducted:  field === 'adv_deducted'  ? newVal : (entry.adv_deducted  || 0),
        shrDeducted:  field === 'shr_deducted'  ? newVal : (entry.shr_deducted  || 0),
      })
      toast.success('Saved ✅', { duration:800 })
    } catch (err) {
      toast.error('Save failed: ' + err.message)
      load() // rollback on error
    } finally {
      setSaving(null)
    }
  }

  const quickAdd = async emp => {
    if (adding.has(emp.name)) return // prevent duplicate
    setAdding(prev => new Set([...prev, emp.name]))
    // Optimistic: immediately move from pending to entered
    const tempEntry = { id:'temp_'+emp.name, name:emp.name, month_label:activePeriod.label, date:activePeriod.date_from, days_worked:wd, leaves:0, adv_deducted:0, shr_deducted:0, period_id:activePeriod.id }
    setAllMonthly(prev => [...prev, tempEntry])
    try {
      await DB.saveMonthly({ id:uid(), name:emp.name, monthLabel:activePeriod.label, date:activePeriod.date_from, daysWorked:wd, leaves:0, advDeducted:0, shrDeducted:0, periodId:activePeriod.id })
      toast.success(`${emp.name} added ✅`, { duration:1000 })
      load()
    } catch (err) {
      setAllMonthly(prev => prev.filter(m => m.id !== 'temp_'+emp.name)) // rollback
      toast.error('Failed: ' + err.message)
    } finally {
      setAdding(prev => { const n = new Set(prev); n.delete(emp.name); return n })
    }
  }

  const bulkAdd = async () => {
    try {
      for (const emp of pendingEmps) await DB.saveMonthly({ id:uid(), name:emp.name, monthLabel:activePeriod.label, date:activePeriod.date_from, daysWorked:bulkForm.daysWorked, leaves:bulkForm.leaves, advDeducted:bulkForm.advDeducted, shrDeducted:bulkForm.shrDeducted, periodId:activePeriod.id })
      toast.success(`${pendingEmps.length} entries added ✅`); setBulkModal(false); load()
    } catch (err) { toast.error('Failed: ' + err.message) }
  }

  const startPeriod = async () => {
    if (!newPeriod.dateFrom || !newPeriod.dateTo) { toast.error('Select dates'); return }
    try {
      const existing = await DB.openMonthlyPeriod()
      if (existing) { toast.error(`"${existing.label}" is already open. Close it first.`); return }
      await DB.saveMonthlyPeriod({ id:uid(), label:newPeriod.label, month_name:newPeriod.label, date_from:newPeriod.dateFrom, date_to:newPeriod.dateTo, status:'open' })
      toast.success(`✅ "${newPeriod.label}" started!`); load()
    } catch (err) {
      console.error('startPeriod error:', err)
      toast.error('Failed to start period. Check if Supabase tables are created. Error: ' + err.message)
    }
  }

  const closePayroll = async () => {
    try {
      await DB.closeMonthlyPeriod(activePeriod.id, totalPay)
      const label = activePeriod.label, entries = [...allMonthly], allEmps = [...emps]
      downloadMonthlyExcel(label, entries, allEmps)
      setTimeout(() => { const r = downloadMonthlyBankFile(label, entries, allEmps, bankList); toast.success(`🏦 Bank files downloaded — SBI: ${r.sbiCount} | Other: ${r.otherCount}`, { duration:4000 }) }, 600)
      toast.success(`✅ "${label}" closed! Files downloading... 📥`)
      setClosedData({ label, entries, allEmps }); setCloseConfirm(false); setActivePeriod(null); setAllMonthly([]); load()
    } catch (err) { toast.error('Failed to close: ' + err.message) }
  }

  const del = async id => {
    try { await DB.deleteMonthly(id); toast.error('Deleted'); setConfirm(null); load() }
    catch (err) { toast.error('Delete failed: ' + err.message) }
  }

  if (loading) return <Layout title="🗓️ Monthly Entry"><Spinner /></Layout>

  if (tableError) {
    return (
      <Layout title="🗓️ Monthly Entry">
        <div style={{ maxWidth:580, margin:'40px auto', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <div style={{ fontSize:20, fontWeight:800, color:'var(--navy)', marginBottom:8 }}>Supabase Tables Not Found</div>
          <div style={{ fontSize:14, color:'var(--mid)', marginBottom:24 }}>The <code>monthly_periods</code> and <code>monthly_entries</code> tables are missing.</div>
          <div style={{ background:'#1e1e2e', borderRadius:12, padding:'16px 20px', textAlign:'left', marginBottom:20 }}>
            <div style={{ color:'#86efac', fontSize:12, fontFamily:'monospace', lineHeight:1.8 }}>
              <div style={{ color:'#94a3b8', marginBottom:8 }}>-- Run this SQL in Supabase → SQL Editor:</div>
              <div>CREATE TABLE IF NOT EXISTS monthly_periods (</div>
              <div>&nbsp;&nbsp;id TEXT PRIMARY KEY,</div>
              <div>&nbsp;&nbsp;label TEXT, month_name TEXT,</div>
              <div>&nbsp;&nbsp;date_from DATE, date_to DATE,</div>
              <div>&nbsp;&nbsp;status TEXT DEFAULT 'open',</div>
              <div>&nbsp;&nbsp;total_payroll NUMERIC DEFAULT 0,</div>
              <div>&nbsp;&nbsp;closed_at TIMESTAMPTZ,</div>
              <div>&nbsp;&nbsp;created_at TIMESTAMPTZ DEFAULT now()</div>
              <div>);</div>
              <br />
              <div>CREATE TABLE IF NOT EXISTS monthly_entries (</div>
              <div>&nbsp;&nbsp;id TEXT PRIMARY KEY,</div>
              <div>&nbsp;&nbsp;name TEXT NOT NULL,</div>
              <div>&nbsp;&nbsp;month_label TEXT, date DATE,</div>
              <div>&nbsp;&nbsp;adv_deducted NUMERIC DEFAULT 0,</div>
              <div>&nbsp;&nbsp;shr_deducted NUMERIC DEFAULT 0,</div>
              <div>&nbsp;&nbsp;period_id TEXT,</div>
              <div>&nbsp;&nbsp;created_at TIMESTAMPTZ DEFAULT now()</div>
              <div>);</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => { setLoading(true); setTableError(false); load() }}>🔄 Retry After Creating Tables</button>
        </div>
      </Layout>
    )
  }

  if (!activePeriod) {
    return (
      <Layout title="🗓️ Monthly Entry">
        {closedData && (
          <div style={{ background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:12, padding:'18px 22px', marginBottom:20, color:'#fff' }}>
            <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:1, opacity:.7, marginBottom:4 }}>✅ Monthly Payroll Closed</div>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:12 }}>{closedData.label}</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={() => { downloadMonthlyBankFile(closedData.label, closedData.entries, closedData.allEmps, bankList); toast.success('Bank files downloading...') }} style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.4)', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>🏦 Re-download Bank Files</button>
              <button onClick={() => setClosedData(null)} style={{ background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.2)', borderRadius:8, padding:'8px 16px', fontSize:13, cursor:'pointer' }}>✕ Dismiss</button>
            </div>
          </div>
        )}
        <div style={{ maxWidth:580, margin:'0 auto' }}>
          <div style={{ textAlign:'center', padding:'32px 0 24px' }}>
            <div style={{ fontSize:52, marginBottom:10 }}>🗓️</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:6 }}>Start a New Monthly Payroll</div>
            <div style={{ fontSize:14, color:'var(--mid)' }}>For {emps.length} monthly salary employees</div>
          </div>
          <Panel title="🟣 Start Monthly Payroll" headerColor="#7c3aed">
            <div className="form-grid cols2" style={{ gap:16, marginBottom:16 }}>
              <Field label="Month"><select value={newPeriod.month} onChange={e => setNewPeriod(p => ({ ...p, month:Number(e.target.value) }))}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select></Field>
              <Field label="Year"><select value={newPeriod.year} onChange={e => setNewPeriod(p => ({ ...p, year:Number(e.target.value) }))}>{[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}</select></Field>
              <Field label="Label"><input value={newPeriod.label} onChange={e => setNewPeriod(p => ({ ...p, label:e.target.value }))} placeholder="e.g. April 2026" /></Field>
              <Field label="From Date"><input type="date" value={newPeriod.dateFrom} onChange={e => setNewPeriod(p => ({ ...p, dateFrom:e.target.value }))} /></Field>
              <Field label="To Date"><input type="date" value={newPeriod.dateTo} onChange={e => setNewPeriod(p => ({ ...p, dateTo:e.target.value }))} /></Field>
            </div>
            {newPeriod.dateFrom && <div style={{ background:'#f3e8ff', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#5b21b6', marginBottom:18 }}>🗓️ <strong>{newPeriod.label}</strong> &nbsp;·&nbsp; {new Date(newPeriod.dateFrom).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} to {new Date(newPeriod.dateTo).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>}
            <button className="btn" style={{ width:'100%', padding:13, fontSize:15, justifyContent:'center', background:'#7c3aed', color:'#fff' }} onClick={startPeriod}>🟣 Start Monthly Payroll — {newPeriod.label}</button>
          </Panel>
          <div style={{ marginTop:16, background:'#f3e8ff', border:'1px solid #d8b4fe', borderRadius:10, padding:'12px 16px', fontSize:12, color:'#5b21b6' }}>
            <strong>Monthly employees ({emps.length}):</strong> {emps.map(e => e.name).join(' · ')}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="🗓️ Monthly Entry">
      <div style={{ background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:12, padding:'18px 22px', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>🟣 Active Monthly Period</div>
            <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginTop:2 }}>{activePeriod.label}</div>
            <div style={{ color:'rgba(255,255,255,.65)', fontSize:12, marginTop:3 }}>📅 {new Date(activePeriod.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} → {new Date(activePeriod.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} &nbsp;·&nbsp; {allMonthly.length}/{emps.length} employees &nbsp;·&nbsp; Total: {fmt(totalPay)}</div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {pendingEmps.length > 0 && <button className="btn" style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.3)' }} onClick={() => setBulkModal(true)}>⚡ Bulk Add ({pendingEmps.length} pending)</button>}
            <button className="btn" style={{ background:'#dc2626', color:'#fff' }} onClick={() => setCloseConfirm(true)}>🔴 Close Monthly Payroll</button>
          </div>
        </div>
        <div style={{ marginTop:14 }}>
          <div style={{ height:6, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', borderRadius:3, background:pendingEmps.length===0?'#22c55e':'#f59e0b', width:`${(allMonthly.length/(emps.length||1))*100}%`, transition:'width .4s' }} /></div>
          <div style={{ marginTop:6, fontSize:11 }}>{pendingEmps.length===0 ? <span style={{ color:'#86efac' }}>✅ All {emps.length} monthly employees entered — ready to close!</span> : <span style={{ color:'#fde68a' }}>⚠️ {pendingEmps.length} employees still pending</span>}</div>
        </div>
      </div>

      <div style={{ background:'#f3e8ff', border:'1px solid #d8b4fe', borderRadius:8, padding:'8px 14px', fontSize:12, color:'#5b21b6', marginBottom:16 }}>
        💡 <strong>Click any value</strong> in Days, Leaves, Adv Ded or Shr Ded to edit inline. Salary = (Gross / {wd} days) × (Days − Leaves) − Deductions.
      </div>

      <div className="toolbar">
        <div className="search-box"><input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <Panel noPad title={`Monthly Attendance — ${activePeriod.label}`} subtitle={`Working days: ${wd}`}>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Gross</th><th style={{ textAlign:'center' }}>Days ✏️</th><th style={{ textAlign:'center' }}>Leaves ✏️</th><th style={{ textAlign:'center' }}>Adv Ded ✏️</th><th style={{ textAlign:'center' }}>Shr Ded ✏️</th><th>Adv Pending</th><th>Shr Pending</th><th>Net Salary</th><th></th></tr></thead>
            <tbody>
              {filtered.map(m => {
                const emp = emps.find(e => e.name === m.name)
                const ap = DB.advPendingMonthly(m.name, advances, allMonthly)
                const sp = DB.shrPendingMonthly(m.name, shortages, allMonthly)
                return (
                  <tr key={m.id} style={{ opacity:saving===m.id?0.5:1, transition:'opacity .2s' }}>
                    <td><strong style={{ fontSize:12 }}>{m.name}</strong>{saving===m.id && <span style={{ fontSize:10, color:'var(--blue)', marginLeft:6 }}>saving...</span>}</td>
                    <td className="amt amt-blue">{fmt(emp?.salary || 0)}</td>
                    <td style={{ textAlign:'center' }}><InlineCell value={Number(m.days_worked||0)} max={31} onSave={v => inlineSave(m,'days_worked',v)} /></td>
                    <td style={{ textAlign:'center' }}><InlineCell value={Number(m.leaves||0)} max={31} onSave={v => inlineSave(m,'leaves',v)} /></td>
                    <td style={{ textAlign:'center' }}><InlineCell value={Number(m.adv_deducted||0)} onSave={v => inlineSave(m,'adv_deducted',v)} color="var(--red)" /></td>
                    <td style={{ textAlign:'center' }}><InlineCell value={Number(m.shr_deducted||0)} onSave={v => inlineSave(m,'shr_deducted',v)} color="var(--red)" /></td>
                    <td className={`amt ${ap>0?'amt-blue':'amt-green'}`}>{fmt(ap)}</td>
                    <td className={`amt ${sp>0?'amt-red':'amt-green'}`}>{fmt(sp)}</td>
                    <td className="amt amt-green"><strong>{fmt(DB.monthlySalary(m, emp, wd))}</strong></td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setConfirm(m.id)}>🗑️</button></td>
                  </tr>
                )
              })}
              {pendingEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())).map(e => (
                <tr key={e.id} style={{ background:'#fdf4ff' }}>
                  <td><strong style={{ fontSize:12, color:'var(--mid)' }}>{e.name}</strong><span style={{ fontSize:10, color:'#7c3aed', background:'#f3e8ff', padding:'1px 6px', borderRadius:10, marginLeft:6 }}>Pending</span></td>
                  <td className="amt amt-blue">{fmt(e.salary)}</td>
                  <td colSpan={7} style={{ color:'var(--mid)', fontSize:12, textAlign:'center' }}>Not entered yet</td>
                  <td><button className="btn btn-success btn-sm" disabled={adding.has(e.name)} onClick={() => quickAdd(e)} style={{ opacity:adding.has(e.name)?0.5:1 }}>{adding.has(e.name)?'Adding...':'+ Add'}</button></td>
                </tr>
              ))}
              {!filtered.length && !pendingEmps.length && <tr><td colSpan={10} style={{ textAlign:'center', padding:28, color:'var(--mid)' }}>No entries for this period</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {bulkModal && (
        <Modal title={`⚡ Bulk Add — ${activePeriod?.label}`} onClose={() => setBulkModal(false)} onSave={bulkAdd} saveLabel={`⚡ Add All ${pendingEmps.length}`}>
          <p style={{ fontSize:13, color:'var(--mid)', marginBottom:16 }}>Set default values for all {pendingEmps.length} pending monthly employees:</p>
          <div className="form-grid cols2" style={{ gap:12 }}>
            <Field label="Days Worked"><input type="number" min={0} max={31} value={bulkForm.daysWorked} onChange={e => setBulkForm(f => ({ ...f, daysWorked:Number(e.target.value) }))} /></Field>
            <Field label="Leaves"><input type="number" min={0} max={31} value={bulkForm.leaves} onChange={e => setBulkForm(f => ({ ...f, leaves:Number(e.target.value) }))} /></Field>
            <Field label="Advance Deducted (₹)"><input type="number" min={0} value={bulkForm.advDeducted} onChange={e => setBulkForm(f => ({ ...f, advDeducted:Number(e.target.value) }))} /></Field>
            <Field label="Shortage Deducted (₹)"><input type="number" min={0} value={bulkForm.shrDeducted} onChange={e => setBulkForm(f => ({ ...f, shrDeducted:Number(e.target.value) }))} /></Field>
          </div>
          <div style={{ fontSize:12, color:'var(--mid)', marginTop:12 }}>Employees: <strong style={{ color:'var(--navy)' }}>{pendingEmps.map(e => e.name).join(', ')}</strong></div>
        </Modal>
      )}

      {closeConfirm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setCloseConfirm(false)}>
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-header"><h3>🔴 Close Monthly Payroll — {activePeriod?.label}</h3></div>
            <div style={{ background:'var(--grey)', borderRadius:10, padding:16, marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ fontSize:13 }}><span style={{ color:'var(--mid)', display:'block', fontSize:11 }}>Entries</span><strong>{allMonthly.length} / {emps.length}</strong></div>
                <div style={{ fontSize:13 }}><span style={{ color:'var(--mid)', display:'block', fontSize:11 }}>Total Payroll</span><strong className="amt-green">{fmt(totalPay)}</strong></div>
                <div style={{ fontSize:13 }}><span style={{ color:'var(--mid)', display:'block', fontSize:11 }}>Missing</span><strong style={{ color:pendingEmps.length>0?'var(--red)':'#16a34a' }}>{pendingEmps.length===0?'✅ None':`${pendingEmps.length} employees`}</strong></div>
              </div>
            </div>
            {pendingEmps.length > 0 && <div style={{ background:'var(--lred)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--red)', marginBottom:14 }}>⚠️ {pendingEmps.length} employees have no entry and will be excluded.</div>}
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#166534', marginBottom:16 }}>
              📥 3 files will download automatically:<br />
              &nbsp;&nbsp;1. <strong>Monthly Payroll Summary</strong> CSV<br />
              &nbsp;&nbsp;2. <strong>SBI Bank</strong> transfer file<br />
              &nbsp;&nbsp;3. <strong>Other Bank</strong> (NEFT/RTGS) file
            </div>
            <p style={{ fontSize:13, color:'#555', marginBottom:20 }}>This month will be <strong>archived</strong> and the page resets for next month.</p>
            <div className="flex-gap" style={{ justifyContent:'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCloseConfirm(false)}>Cancel</button>
              <button className="btn btn-sm" style={{ background:'#dc2626', color:'#fff' }} onClick={closePayroll}>🔴 Close & Download Files</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <Confirm message="Delete this entry?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
