import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Download, Printer, Send, 
  Trash2, Plus, Zap, CheckCircle, AlertTriangle,
  History, Lock, Unlock, FileSpreadsheet
} from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const REMITTER_ACC   = '33284893641'
const REMITTER_NAME  = 'THULIR AGENCY'
const REMITTER_ADDR  = 'ERODE'
const REMITTER_EMAIL = 'sbi.12777@sbi.co.in'

function downloadBankFile(label, entries, emps, bankList, wd) {
  const sbiRows = [], otherRows = []
  entries.forEach((w, idx) => {
    const emp    = emps.find(e => e.name === w.name)
    const bank   = bankList.find(b => b.name === w.name) || {}
    const salary = Math.round(DB.weekSalary(w, emp, wd))
    if (!bank.acc || salary <= 0) return
    const refNo = `THULIRSAL${String(idx + 1).padStart(6, '0')}`
    if (bank.bank && bank.bank.toUpperCase() === 'SBI') {
      sbiRows.push([w.name, bank.acc, bank.ifsc || '', salary])
    } else {
      otherRows.push([REMITTER_ACC, REMITTER_NAME, REMITTER_ADDR, bank.acc, w.name, REMITTER_ADDR, bank.ifsc || '', 'SAL', 'ATTN', REMITTER_EMAIL, refNo, salary])
    }
  })
  const sbiTotal    = sbiRows.reduce((s, r) => s + r[3], 0)
  const sbiCsvRows  = [['ACCOUNT HOLDER NAME','ACCOUNT NUMBER','IFSC CODE','NET SALERY'], ...sbiRows, ['','','TOTAL', sbiTotal]]
  const otherCsvRows = [['RemitterAcno','RemitterName','RemitterAddress','BenificiaryAcno','BenificiaryName','BenificiaryAddress','BenificiaryIFSC','PaymentDetails','Sender to Receiver Code (ATTN / FAST / URGENT / DETAIL / NREAC)','RemitterEmail','RefNo','Amount'], ...otherRows]
  const toCSV = rows => rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
  const bom   = '\uFEFF'
  const slug  = label.replace(/\s+/g, '-')
  const dl    = (csv, name) => { const b = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u) }
  dl(toCSV(sbiCsvRows),   `${slug}-SBI.csv`)
  setTimeout(() => dl(toCSV(otherCsvRows), `${slug}-OtherBank.csv`), 800)
  return { sbiCount: sbiRows.length, otherCount: otherRows.length }
}

function downloadPayrollExcel(label, entries, emps, wd) {
  const rows = [['THULIR AGENCY — PAYROLL'], [label], [`Generated: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}`], [], ['S.No','Employee Name','Net Salary (₹)']]
  let total = 0
  entries.forEach((w, i) => { const emp = emps.find(e => e.name === w.name); const s = Math.round(DB.weekSalary(w, emp, wd)); total += s; rows.push([i+1, w.name, s]) })
  rows.push([], ['','TOTAL', total])
  const blob = new Blob(['\uFEFF' + rows.map(r => r.map(v => `"${v??''}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${label.replace(/\s+/g,'-')}-Payroll.csv`; a.click()
}

function PrintPayrollSheet({ label, entries, emps, bankList, wd, onClose }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  let grandTotal = 0
  const rows = entries.map((w, i) => { const emp = emps.find(e => e.name === w.name); const bank = bankList.find(b => b.name === w.name) || {}; const salary = Math.round(DB.weekSalary(w, emp, wd)); grandTotal += salary; return { i: i+1, name: w.name, bank: bank.bank||'—', acc: bank.acc||'—', ifsc: bank.ifsc||'—', salary } })
  return (
    <>
      <style>{`@media print { body * { visibility: hidden !important; } #print-sheet, #print-sheet * { visibility: visible !important; } #print-sheet { position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; background: #fff; } #print-no-print { display: none !important; } }`}</style>
      <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ width: '100%', maxWidth: 840, padding: 40, maxHeight: '90vh', overflow: 'auto', background: '#fff' }}>
          <div id="print-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>Payroll Document — {label}</h3>
            <div className="flex-gap">
              <button className="btn btn-blue" onClick={() => window.print()}><Printer size={16} /> Print Now</button>
              <button className="btn" style={{ background: '#f1f5f9' }} onClick={onClose}>Dismiss</button>
            </div>
          </div>
          <div id="print-sheet" style={{ background: '#fff', fontFamily: 'Arial, sans-serif', color: '#000' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: -1 }}>THULIR AGENCY</div>
              <div style={{ fontSize: 12, color: '#333', marginTop: 4, fontWeight: 500 }}>PERUNDURAI ROAD, ERODE · TAMIL NADU</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 16, textDecoration: 'underline' }}>WEEKLY SALARY STATEMENT — {label.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Generated: {today}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  {['S.No','Employee Name','Bank Details','Net Salary (₹)','Signature'].map(h => <th key={h} style={{ padding: '10px 12px', border: '1px solid #000', textAlign: h==='Net Salary (₹)'?'right':'left', fontSize: 11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'center', fontSize: 12 }}>{r.i}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #000', fontWeight: 700, fontSize: 13 }}>{r.name}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #000', fontSize: 11 }}>
                      <strong>{r.bank}</strong><br/>{r.acc} | {r.ifsc}
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid #000', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>{r.salary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid #000' }}></td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                  <td colSpan={3} style={{ padding: '12px', border: '1px solid #000', textAlign: 'right', fontSize: 12 }}>GRAND TOTAL PAYABLE</td>
                  <td style={{ padding: '12px', border: '1px solid #000', textAlign: 'right', fontSize: 18 }}>₹{grandTotal.toLocaleString('en-IN')}</td>
                  <td style={{ border: '1px solid #000' }}></td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, fontSize: 12 }}>
              {['Prepared By','Accounts Manager','Managing Director'].map(l => <div key={l} style={{ textAlign: 'center' }}><div style={{ borderTop: '1.5px solid #000', paddingTop: 8, fontWeight: 700 }}>{l}</div></div>)}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function WhatsAppBulkModal({ label, entries, emps, bankList, wd, onClose }) {
  const [sent, setSent] = useState(new Set())
  const rows = entries.map(w => { const emp = emps.find(e => e.name === w.name); const bank = bankList.find(b => b.name === w.name) || {}; return { ...w, bank, salary: Math.round(DB.weekSalary(w, emp, wd)), phone: bank.phone || '' } })
  const withPhone = rows.filter(r => r.phone), withoutPhone = rows.filter(r => !r.phone)
  const buildMsg = r => [`🏢 *THULIR AGENCY*`,`📍 Perundurai Road, Erode`,``,`📄 *SALARY SLIP — ${label}*`,``,`👤 *${r.name}*`,`✅ *Days Worked:* ${Number(r.days_worked||0)-Number(r.leaves||0)} days`,`💸 *Advance Deducted:* ₹${Number(r.adv_deducted||0).toLocaleString('en-IN')}`,`⚠️ *Shortage Deducted:* ₹${Number(r.shr_deducted||0).toLocaleString('en-IN')}`,``,`━━━━━━━━━━━━━━━━`,`💰 *NET SALARY: ₹${r.salary.toLocaleString('en-IN')}*`,`━━━━━━━━━━━━━━━━`,``,`🏦 *Bank:* ${r.bank.bank||'—'}`,`🔢 *A/C:* ${r.bank.acc||'—'}`,`📋 *IFSC:* ${r.bank.ifsc||'—'}`,``,`_Thulir Agency Payroll System_`].join('\n')
  const sendOne = r => { window.open(`https://wa.me/91${r.phone.replace(/\D/g,'')}?text=${encodeURIComponent(buildMsg(r))}`, '_blank'); setSent(s => new Set([...s, r.name])) }
  const sendNext = () => { const next = withPhone.find(r => !sent.has(r.name)); if (next) sendOne(next) }
  
  return (
    <Modal title="📱 WhatsApp Notifications" onClose={onClose} onSave={sendNext} saveLabel={sent.size === withPhone.length ? "Done" : "Send Next"}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { l: 'With Phone', v: withPhone.length, c: 'var(--navy)' },
          { l: 'Sent', v: sent.size, c: 'var(--emerald)' },
          { l: 'Remaining', v: withPhone.length - sent.size, c: 'var(--amber)' }
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg)', padding: '16px', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', opacity: 0.5, textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="tbl-wrap" style={{ maxHeight: 300, border: '1px solid var(--border)' }}>
        <table>
          <thead>
            <tr><th>Employee</th><th>Phone</th><th style={{ textAlign: 'right' }}>Status</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name}>
                <td><strong style={{ fontSize: 13 }}>{r.name}</strong></td>
                <td style={{ fontSize: 12, color: 'var(--slate)' }}>{r.phone || 'No phone'}</td>
                <td style={{ textAlign: 'right' }}>
                  {sent.has(r.name) ? <span className="badge badge-green">Sent</span> : r.phone ? <span className="badge badge-blue">Pending</span> : <span className="badge badge-red">Missing</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

function InlineCell({ value, onSave, min = 0, max, color }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  useEffect(() => { setVal(value) }, [value])
  const commit = () => { setEditing(false); const num = Number(val); if (num !== value) onSave(num) }
  if (editing) return <input type="number" min={min} max={max} value={val} autoFocus onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setVal(value); setEditing(false) } }} style={{ width:60, height:32, textAlign:'center', border:'2px solid var(--blue)', borderRadius:8, fontFamily:'var(--mono)', fontSize:13, fontWeight:700, outline:'none', background:'#fff' }} />
  return <span onClick={() => setEditing(true)} style={{ cursor:'pointer', fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:color||'var(--navy)', padding:'6px 12px', borderRadius:8, display:'inline-block', border:'1px dashed #cbd5e1', transition:'all .2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.background='var(--bg)' }} onMouseLeave={e => { e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.background='transparent' }}>{value}</span>
}

export function Periods() {
  const [periods, setPeriods] = useState([])
  const [emps, setEmps] = useState([])
  const [wd, setWd] = useState(26)
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)
  const [viewEntries, setViewEntries] = useState([])
  const load = useCallback(async () => { const [p,e,w] = await Promise.all([DB.periods(),DB.employees(),DB.getWorkingDays()]); setPeriods(p); setEmps(e); setWd(w); setLoading(false) }, [])
  useEffect(() => { load() }, [load])
  const open = periods.find(p => p.status==='open'), closed = periods.filter(p => p.status==='closed')
  const reopen = async p => { if (open && open.id!==p.id) { toast.error(`"${open.label}" is active. Close it first.`); return }; await DB.reopenPeriod(p.id); toast.success(`"${p.label}" reopened`); load() }
  const viewPeriod = async p => { const entries = await DB.weeklyByPeriod(p.id); setViewEntries(entries); setViewModal(p) }
  
  if (loading) return <Layout title="Payroll Archive"><Spinner /></Layout>

  return (
    <Layout title="Weekly Payroll History">
      {open ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 24, padding: '32px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow)' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--blue)', marginBottom: 8 }}>🟢 Active Processing Period</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: 'var(--navy)' }}>{open.label}</div>
            <div style={{ color: 'var(--slate)', opacity: 0.7, fontSize: 14, fontWeight: 500, marginTop: 4 }}>{new Date(open.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'long'})} — {new Date(open.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>
          </div>
          <div style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '12px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: '1px solid var(--blue-light)' }}>Currently accepting entries</div>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', border: '2px dashed var(--border)', borderRadius: 24, padding: '40px', marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>Ready for new period</h3>
          <p style={{ color: 'var(--slate)', opacity: 0.6, fontSize: 14 }}>Navigate to Weekly Entry to begin the next payroll cycle</p>
        </div>
      )}

      <Panel title="Historical Payroll Archives" subtitle={`${closed.length} completed cycles`} noPad>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Period Label</th><th>Month</th><th>Duration</th><th>Total Payout</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {closed.map(p => (
                <tr key={p.id}>
                  <td><strong style={{ fontSize: 15 }}>{p.label}</strong></td>
                  <td><span className="badge badge-blue">{p.month_name}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--slate)', opacity: 0.6 }}>{new Date(p.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(p.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                  <td className="amt amt-green" style={{ fontSize: 15, fontWeight: 800 }}>{fmt(p.total_payroll||0)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" style={{ background: 'var(--bg)', color: 'var(--navy)', border: 'none' }} onClick={() => viewPeriod(p)}>Details</button>
                      <button className="btn btn-sm" style={{ background: '#fff7ed', color: '#c2410c', border: 'none' }} onClick={() => reopen(p)}>Unlock</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {viewModal && (
        <Modal title={`History: ${viewModal.label}`} onClose={() => setViewModal(null)} onSave={() => setViewModal(null)} saveLabel="Close">
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)' }}>{viewEntries.length} employees paid</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald)' }}>{fmt(viewModal.total_payroll||0)}</div>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: '60vh', border: '1px solid var(--border)' }}>
            <table>
              <thead>
                <tr><th>Staff</th><th style={{ textAlign: 'center' }}>Days</th><th style={{ textAlign: 'right' }}>Salary</th></tr>
              </thead>
              <tbody>
                {viewEntries.map(w => (
                  <tr key={w.id}>
                    <td><strong style={{ fontSize: 13 }}>{w.name}</strong></td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-blue">{w.days_worked}d</span></td>
                    <td className="amt amt-green" style={{ textAlign: 'right' }}>{fmt(DB.weekSalary(w, emps.find(e => e.name===w.name), wd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

export function Weekly() {
  const [allWeekly, setAllWeekly]       = useState([])
  const [allWeeklyHist, setAllWeeklyHist] = useState([])
  const [emps, setEmps]                 = useState([])
  const [advances, setAdvances]         = useState([])
  const [shortages, setShortages]       = useState([])
  const [bankList, setBankList]         = useState([])
  const [wd, setWd]                     = useState(26)
  const [activePeriod, setActivePeriod] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [confirm, setConfirm]           = useState(null)
  const [search, setSearch]             = useState('')
  const [bulkModal, setBulkModal]       = useState(false)
  const [bulkForm, setBulkForm]         = useState({ daysWorked:6, leaves:0, advDeducted:0, shrDeducted:0 })
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saving, setSaving]             = useState(null)
  const [adding, setAdding]             = useState(new Set())
  const [showPrint, setShowPrint]       = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [closedData, setClosedData]     = useState(null)

  const now = new Date()
  const [newPeriod, setNewPeriod] = useState({ month:now.getMonth(), year:now.getFullYear(), weekNum:1, label:'', dateFrom:'', dateTo:'' })

  useEffect(() => {
    const { month, year, weekNum } = newPeriod
    const ranges = [[1,7],[8,14],[15,21],[22,28],[29,null]]
    const [dayFrom, dayTo] = ranges[weekNum-1]
    const lastDay = new Date(year, month+1, 0).getDate()
    const pad = n => String(n).padStart(2,'0')
    setNewPeriod(p => ({ ...p, dateFrom:`${year}-${pad(month+1)}-${pad(dayFrom)}`, dateTo:`${year}-${pad(month+1)}-${pad(dayTo||lastDay)}`, label:`${MONTHS[month]} Week ${weekNum}` }))
  }, [newPeriod.month, newPeriod.year, newPeriod.weekNum])

  const load = useCallback(async () => {
    const [allW, e, a, s, wdays, ap, b] = await Promise.all([
      DB.weekly(), DB.employees(), DB.advances(), DB.shortages(), DB.getWorkingDays(), DB.openPeriod(), DB.bank()
    ])
    setEmps(e); setAdvances(a); setShortages(s); setWd(wdays); setActivePeriod(ap); setBankList(b);
    if (ap) { setAllWeekly(allW.filter(x => x.period_id === ap.id)); setAllWeeklyHist(allW) } 
    else { setAllWeekly([]); setAllWeeklyHist([]) }
    setLoading(false)
  }, [])
  
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    if (loading || !emps.length) return { empMap: {}, advMap: {}, shrMap: {}, dedMap: {}, pending: [], total: 0 }
    const empMap  = DB.createEmpMap(emps)
    const advMap  = DB.createAdvMap(advances)
    const shrMap  = DB.createAdvMap(shortages)
    const dedMap  = DB.createDedMap(allWeeklyHist)
    const enteredNames = new Set(allWeekly.map(w => w.name))
    const weeklyOnly   = emps.filter(e => e.salary_type === 'weekly' || !e.salary_type)
    const pending      = weeklyOnly.filter(e => !enteredNames.has(e.name))
    const total = allWeekly.reduce((s, w) => s + DB.weekSalary(w, empMap[w.name], wd), 0)
    return { empMap, advMap, shrMap, dedMap, pending, total, weeklyOnly }
  }, [allWeekly, allWeeklyHist, emps, advances, shortages, wd, loading])

  const { empMap, advMap, shrMap, dedMap, pending: pendingEmps, total: totalPay, weeklyOnly: weeklyOnlyEmps } = stats
  const filtered = allWeekly.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()))

  const inlineSave = async (entry, field, newVal) => {
    setAllWeekly(prev => prev.map(w => w.id === entry.id ? { ...w, [field]: newVal } : w))
    setSaving(entry.id)
    try {
      await DB.updateWeekly({ id: entry.id, name: entry.name, weekLabel: entry.week_label, date: entry.date, periodId: entry.period_id, daysWorked: field === 'days_worked' ? newVal : (entry.days_worked || 0), leaves: field === 'leaves' ? newVal : (entry.leaves || 0), advDeducted: field === 'adv_deducted' ? newVal : (entry.adv_deducted || 0), shrDeducted: field === 'shr_deducted' ? newVal : (entry.shr_deducted || 0) })
      toast.success('Saved', { duration: 800 })
    } catch (err) { toast.error('Failed'); load() } finally { setSaving(null) }
  }

  const quickAdd = async emp => {
    if (adding.has(emp.name)) return
    setAdding(prev => new Set([...prev, emp.name]))
    try {
      await DB.saveWeekly({ id:uid(), name:emp.name, weekLabel:activePeriod.label, date:activePeriod.date_from, daysWorked:6, leaves:0, advDeducted:0, shrDeducted:0, periodId:activePeriod.id })
      load()
    } catch (err) { toast.error('Error') } finally { setAdding(prev => { const n = new Set(prev); n.delete(emp.name); return n }) }
  }

  const bulkAdd = async () => {
    for (const emp of pendingEmps) await DB.saveWeekly({ id:uid(), name:emp.name, weekLabel:activePeriod.label, date:activePeriod.date_from, ...bulkForm, periodId:activePeriod.id })
    setBulkModal(false); load()
  }

  const closePayroll = async () => {
    await DB.closePeriod(activePeriod.id, totalPay)
    const label = activePeriod.label, entries = [...allWeekly]
    downloadPayrollExcel(label, entries, emps, wd)
    setTimeout(() => downloadBankFile(label, entries, emps, bankList, wd), 600)
    setClosedData({ label, entries }); setCloseConfirm(false); setActivePeriod(null); load()
  }

  const del = async id => { await DB.deleteWeekly(id); setConfirm(null); load() }

  if (loading) return <Layout title="Weekly Entry"><Spinner /></Layout>

  if (!activePeriod) {
    return (
      <Layout title="Weekly Entry">
        <AnimatePresence>
          {closedData && (
            <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ background: 'var(--white)', border: '1px solid var(--emerald)', borderLeft: '6px solid var(--emerald)', borderRadius: 16, padding: '24px 32px', marginBottom: 32, boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--emerald)', marginBottom: 4 }}>✅ Payroll Finalized</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{closedData.label}</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn" style={{ background: 'var(--grey)', color: 'var(--navy)', border: 'none' }} onClick={() => setShowPrint(true)}><Printer size={16}/> Print</button>
                  <button className="btn btn-blue" onClick={() => setShowWhatsApp(true)}><Send size={16}/> Notify Staff</button>
                  <button className="btn" style={{ background: 'var(--grey)', color: 'var(--slate)', border: 'none' }} onClick={() => setClosedData(null)}><X size={16}/></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Panel title="Initialize New Period" subtitle="Begin weekly payroll processing">
            <div className="form-grid cols2" style={{ marginBottom: 24 }}>
              <Field label="Month"><select className="form-input" value={newPeriod.month} onChange={e => setNewPeriod(p => ({ ...p, month:Number(e.target.value) }))}>{MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}</select></Field>
              <Field label="Week Number">
                <select className="form-input" value={newPeriod.weekNum} onChange={e => setNewPeriod(p => ({ ...p, weekNum:Number(e.target.value) }))}>
                  <option value={1}>Week 1</option><option value={2}>Week 2</option><option value={3}>Week 3</option><option value={4}>Week 4</option><option value={5}>Week 5</option>
                </select>
              </Field>
            </div>
            <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Auto-Generated Details</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 18, color: 'var(--navy)' }}>{newPeriod.label}</strong>
                <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--slate)' }}>{new Date(newPeriod.dateFrom).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(newPeriod.dateTo).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</div>
              </div>
            </div>
            <button className="btn btn-blue" style={{ width: '100%', padding: '16px', justifyContent: 'center' }} onClick={() => DB.savePeriod({ id:uid(), label:newPeriod.label, month_name:`${MONTHS[newPeriod.month]} ${newPeriod.year}`, date_from:newPeriod.dateFrom, date_to:newPeriod.dateTo, status:'open' }).then(load)}>
              Start Active Payroll Week
            </button>
          </Panel>
        </div>
        {showPrint && <PrintPayrollSheet label={closedData.label} entries={closedData.entries} emps={emps} bankList={bankList} wd={wd} onClose={() => setShowPrint(false)} />}
        {showWhatsApp && <WhatsAppBulkModal label={closedData.label} entries={closedData.entries} emps={emps} bankList={bankList} wd={wd} onClose={() => setShowWhatsApp(false)} />}
      </Layout>
    )
  }

  return (
    <Layout title="Weekly Payroll Entry">
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 24, padding: '32px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--blue)', letterSpacing: 1.5 }}>Active Processing Period</div>
          <div style={{ fontSize: 28, fontWeight: 800, margin: '4px 0', color: 'var(--navy)' }}>{activePeriod.label}</div>
          <div style={{ color: 'var(--slate)', opacity: 0.7, fontSize: 14, fontWeight: 500 }}>{allWeekly.length} / {weeklyOnlyEmps.length} Employees Entered</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {pendingEmps.length > 0 && <button className="btn" style={{ background: 'var(--grey)', color: 'var(--navy)', border: 'none' }} onClick={() => setBulkModal(true)}><Zap size={16}/> Bulk Action</button>}
          <button className="btn" style={{ background: 'var(--rose-light)', color: 'var(--rose)', border: 'none' }} onClick={() => setCloseConfirm(true)}><Lock size={16}/> Close & Download</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input placeholder="Quick search staff..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--border)', background: '#fff', outline: 'none', fontWeight: 600 }} />
      </div>

      <Panel noPad subtitle="Tip: Click any dashed box to edit values instantly">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Staff Member</th><th style={{ textAlign:'center' }}>Days</th><th style={{ textAlign:'center' }}>Leaves</th><th style={{ textAlign:'center' }}>Advance</th><th style={{ textAlign:'center' }}>Shortage</th><th>Net Salary</th><th style={{ textAlign:'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} style={{ opacity: saving===w.id ? 0.4 : 1 }}>
                  <td><strong style={{ fontSize: 14 }}>{w.name}</strong></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(w.days_worked||0)} max={7} onSave={v => inlineSave(w,'days_worked',v)} /></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(w.leaves||0)} max={7} onSave={v => inlineSave(w,'leaves',v)} /></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(w.adv_deducted||0)} onSave={v => inlineSave(w,'adv_deducted',v)} color="var(--rose)" /></td>
                  <td style={{ textAlign:'center' }}><InlineCell value={Number(w.shr_deducted||0)} onSave={v => inlineSave(w,'shr_deducted',v)} color="var(--rose)" /></td>
                  <td className="amt amt-green" style={{ fontSize: 15 }}>{fmt(DB.weekSalary(w, empMap[w.name], wd))}</td>
                  <td style={{ textAlign:'right' }}><button className="btn btn-sm btn-danger" onClick={() => setConfirm(w.id)}><Trash2 size={14}/></button></td>
                </tr>
              ))}
              {pendingEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())).map(e => (
                <tr key={e.id} style={{ background: '#fffbeb' }}>
                  <td style={{ opacity: 0.5 }}>{e.name}</td>
                  <td colSpan={5} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>PENDING ENTRY</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-blue" onClick={() => quickAdd(e)}>+ Quick Add</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {bulkModal && (
        <Modal title="⚡ Bulk Attendance Entry" onClose={() => setBulkModal(false)} onSave={bulkAdd} saveLabel={`Apply to ${pendingEmps.length} Employees`}>
          <div className="form-grid cols2">
            <Field label="Standard Days"><input type="number" className="form-input" value={bulkForm.daysWorked} onChange={e => setBulkForm(f => ({ ...f, daysWorked:Number(e.target.value) }))} /></Field>
            <Field label="Standard Leaves"><input type="number" className="form-input" value={bulkForm.leaves} onChange={e => setBulkForm(f => ({ ...f, leaves:Number(e.target.value) }))} /></Field>
          </div>
        </Modal>
      )}

      {closeConfirm && (
        <Modal title="🔴 Finalize Weekly Payroll" onClose={() => setCloseConfirm(false)} onSave={closePayroll} saveLabel="Confirm & Archive">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 24 }}>Closing will archive <strong>{allWeekly.length} entries</strong> and generate bank transfer files.</div>
            <div style={{ background: 'var(--bg)', borderRadius: 16, padding: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span>Total Payout:</span><strong>{fmt(totalPay)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Missing Staff:</span><strong style={{ color: 'var(--rose)' }}>{pendingEmps.length}</strong></div>
            </div>
          </div>
        </Modal>
      )}

      {confirm && <Confirm message="Delete this attendance record?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
