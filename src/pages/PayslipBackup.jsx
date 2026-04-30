import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Spinner } from '../components/UI'

// ── PAYSLIP ──────────────────────────────────────────────────────
export function Payslip() {
  const [emps, setEmps] = useState([])
  const [weekly, setWeekly] = useState([])
  const [bankList, setBankList] = useState([])
  const [wd, setWd] = useState(26)
  const [selEmp, setSelEmp] = useState('')
  const [selWeek, setSelWeek] = useState('')
  const [waNumber, setWaNumber] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([DB.employees(), DB.weekly(), DB.bank(), DB.getWorkingDays()])
      .then(([e, w, b, wdays]) => {
        setEmps(e); setWeekly(w); setBankList(b); setWd(wdays)
        if (e.length) setSelEmp(e[0].name)
        setLoading(false)
      })
  }, [])

  // Auto-fill phone when emp changes
  useEffect(() => {
    const bank = bankList.find(b => b.name === selEmp)
    if (bank?.phone) setWaNumber(bank.phone)
  }, [selEmp, bankList])

  const weeks = ['', ...new Set(weekly.map(w => w.week_label))]
  const emp = emps.find(e => e.name === selEmp)
  const entries = weekly.filter(w => w.name === selEmp && (!selWeek || w.week_label === selWeek))
  const pd = emp ? DB.perDay(emp, wd) : 0
  const totalDays = entries.reduce((s, w) => s + Number(w.days_worked || 0) - Number(w.leaves || 0), 0)
  const totalAdv  = entries.reduce((s, w) => s + Number(w.adv_deducted || 0), 0)
  const totalShr  = entries.reduce((s, w) => s + Number(w.shr_deducted || 0), 0)
  const earned    = pd * totalDays
  const netPay    = earned - totalAdv - totalShr
  const bank      = bankList.find(b => b.name === selEmp) || {}

  const shareWhatsApp = () => {
    if (!emp) return
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const msg = [
      `🏢 *THULIR AGENCY*`,
      `📍 Perundurai Road, Erode`,
      ``,
      `📄 *SALARY SLIP — ${selWeek || 'All Weeks'}*`,
      `📅 Generated: ${today}`,
      ``,
      `👤 *Employee:* ${emp.name}`,
      `💰 *Monthly Salary:* ${fmt(emp.salary)}`,
      `📆 *Per Day Rate:* ${fmt(Math.round(pd))}`,
      `✅ *Days Worked:* ${totalDays} days`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💵 *EARNINGS*`,
      `Salary Earned: ${fmt(Math.round(earned))}`,
      `Gross Total: ${fmt(Math.round(earned))}`,
      ``,
      `💸 *DEDUCTIONS*`,
      `Advance Deducted: ${fmt(totalAdv)}`,
      `Shortage Deducted: ${fmt(totalShr)}`,
      `Total Deductions: ${fmt(totalAdv + totalShr)}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏦 *NET PAY: ${fmt(Math.round(netPay))}*`,
      ``,
      `Bank: ${bank.bank || '—'} | A/C: ${bank.acc || '—'}`,
      `IFSC: ${bank.ifsc || '—'}`,
      ``,
      `_Computer-generated payslip_`,
    ].join('\n')
    const encoded = encodeURIComponent(msg)
    const num = waNumber.trim().replace(/\D/g, '')
    const url = num.length === 10 ? `https://wa.me/91${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
    toast.success('Opening WhatsApp ✅')
  }

  if (loading) return <Layout title="🧾 Payslip"><Spinner /></Layout>

  return (
    <Layout title="🧾 Payslip Generator">
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Selector */}
        <Panel title="Select Employee">
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Employee</label>
            <select value={selEmp} onChange={e => setSelEmp(e.target.value)}>
              {emps.map(e => <option key={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Week</label>
            <select value={selWeek} onChange={e => setSelWeek(e.target.value)}>
              {weeks.map(w => <option key={w} value={w}>{w || 'All Weeks'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label>📱 WhatsApp Number</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--mid)' }}>+91</span>
              <input type="tel" maxLength={10} value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="9876543210" style={{ paddingLeft: 40 }} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>🖨️ Print</button>
        </Panel>

        {/* Payslip */}
        {emp ? (
          <div className="payslip" style={{ border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', background: '#fff', borderRadius: 20 }}>
            <div className="payslip-header" style={{ borderBottom: '2px solid var(--blue)', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)', letterSpacing: -0.5 }}>THULIR AGENCY</div>
              <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--mid)' }}>Perundurai Road, Erode | TN, India</p>
              <div style={{ marginTop: 12, display: 'inline-block', padding: '6px 16px', background: 'var(--lblue)', color: 'var(--blue)', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Salary Statement — {selWeek || 'Consolidated'}
              </div>
            </div>
            
            <div className="payslip-body" style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 6 }}>Employee Details</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{emp.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>{bank.bank || '—'} · {bank.acc || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 6 }}>Statement Period</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selWeek || 'All Records'}</div>
                  <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>Days Worked: <strong>{totalDays}</strong></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '24px 0', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <h4 style={{ fontSize: 12, color: 'var(--green)', marginBottom: 12, borderLeft: '3px solid var(--green)', paddingLeft: 8 }}>EARNINGS</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span>Basic Salary</span>
                    <span>{fmt(earned)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                    <span>Gross Total</span>
                    <span style={{ color: 'var(--green)' }}>{fmt(earned)}</span>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, borderLeft: '3px solid var(--red)', paddingLeft: 8 }}>DEDUCTIONS</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span>Advance Recovery</span>
                    <span>{fmt(totalAdv)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span>Shortage Recovery</span>
                    <span>{fmt(totalShr)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                    <span>Total Deductions</span>
                    <span style={{ color: 'var(--red)' }}>{fmt(totalAdv + totalShr)}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 40, padding: '24px', background: 'var(--navy)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Net Take-Home Pay</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Transferred to Bank Account</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(netPay)}</div>
              </div>

              <div style={{ marginTop: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--mid)', fontStyle: 'italic' }}>
                  This is a computer-generated document and does not require a physical signature.
                </p>
                
                <div className="no-print" style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={shareWhatsApp} className="btn" style={{ background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📲 WhatsApp
                  </button>
                  <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    🖨️ Print / Save PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ background: '#fff', borderRadius: 16, padding: 64, boxShadow: 'var(--shadow)' }}>
            <div className="icon">🧾</div>
            <p>Select an employee to generate payslip</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

// ── BACKUP ───────────────────────────────────────────────────────
export function Backup() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([DB.employees(), DB.weekly(), DB.advances(), DB.shortages(), DB.bank()])
      .then(([e, w, a, s, b]) => setStats({ e: e.length, w: w.length, a: a.length, s: s.length, b: b.length }))
  }, [])

  const doExport = async () => {
    toast('Preparing backup...', { icon: '⏳' })
    const [e, w, a, s, b, wd] = await Promise.all([DB.employees(), DB.weekly(), DB.advances(), DB.shortages(), DB.bank(), DB.getWorkingDays()])
    const backup = { version: '2.0-react', exportedAt: new Date().toISOString(), exportedAtReadable: new Date().toLocaleString('en-IN'), data: { employees: e, weekly: w, advances: a, shortages: s, bank: b, working_days: wd } }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a2   = document.createElement('a')
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
    a2.href = url; a2.download = `thulir-payroll-backup-${date}.json`
    a2.click(); URL.revokeObjectURL(url)
    toast.success('Backup downloaded ✅')
  }

  const doExportCSV = async () => {
    const [weekly, emps, wd] = await Promise.all([DB.weekly(), DB.employees(), DB.getWorkingDays()])
    const rows = [['Employee','Week','Date','Days','Leaves','Adv Deducted','Shr Deducted','Week Salary']]
    weekly.forEach(w => {
      const emp = emps.find(e => e.name === w.name)
      rows.push([w.name, w.week_label || '', w.date || '', w.days_worked || 0, w.leaves || 0, w.adv_deducted || 0, w.shr_deducted || 0, DB.weekSalary(w, emp, wd).toFixed(2)])
    })
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a2   = document.createElement('a')
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
    a2.href = url; a2.download = `thulir-weekly-${date}.csv`
    a2.click(); URL.revokeObjectURL(url)
    toast.success('CSV exported ✅')
  }

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const backup = JSON.parse(ev.target.result)
        if (!backup.data) throw new Error('Invalid')
        if (!window.confirm(`Restore backup from ${backup.exportedAtReadable}? This will replace all data.`)) return
        const d = backup.data
        for (const emp of (d.employees || [])) { try { await DB.saveEmployee(emp) } catch { await DB.updateEmployee(emp) } }
        for (const w of (d.weekly || [])) { try { await DB.saveWeekly({ id: w.id, weekLabel: w.week_label, date: w.date, name: w.name, daysWorked: w.days_worked, leaves: w.leaves, advDeducted: w.adv_deducted, shrDeducted: w.shr_deducted, periodId: w.period_id }) } catch {} }
        for (const a of (d.advances || [])) { try { await DB.saveAdvance(a) } catch {} }
        for (const s of (d.shortages || [])) { try { await DB.saveShortage(s) } catch {} }
        for (const b of (d.bank || [])) { await DB.upsertBank(b) }
        if (d.working_days) await DB.setWorkingDays(d.working_days)
        toast.success('Restored successfully ✅')
        const [emp2, wk2, adv2, shr2, bnk2] = await Promise.all([DB.employees(), DB.weekly(), DB.advances(), DB.shortages(), DB.bank()])
        setStats({ e: emp2.length, w: wk2.length, a: adv2.length, s: shr2.length, b: bnk2.length })
      } catch { toast.error('Invalid backup file') }
    }
    reader.readAsText(file)
  }

  return (
    <Layout title="💾 Backup & Export">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
            {[['👥','Employees',stats.e],['📅','Weekly',stats.w],['💰','Advances',stats.a],['⚠️','Shortages',stats.s],['🏦','Bank',stats.b]].map(([icon,label,count]) => (
              <div key={label} style={{ background: 'var(--grey)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--mid)' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: 'var(--lgreen)', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: 'var(--green)', marginBottom: 20 }}>
          ✅ Data is saved in <strong>Supabase cloud</strong> — accessible from any device!
        </div>

        <Panel title="💾 Export Backup" subtitle="Download all data as JSON">
          <p style={{ fontSize: 13, color: '#444', marginBottom: 18, lineHeight: 1.7 }}>
            Download a full backup of all your Supabase data. Keep this as an offline copy.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={doExport}>⬇️ Download Backup</button>
            <button className="btn btn-ghost" onClick={doExportCSV}>📊 Export Weekly as CSV</button>
          </div>
          <div style={{ background: 'var(--yellow)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
            💡 Do a backup every Friday. Save to Google Drive as extra safety.
          </div>
        </Panel>

        <Panel title="📂 Restore from Backup" headerColor="#1a4731">
          <p style={{ fontSize: 13, color: '#444', marginBottom: 18 }}>Upload a previously exported JSON backup to restore all data.</p>
          <label style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--navy)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            📁 Choose Backup File
            <input type="file" accept=".json" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </Panel>
      </div>
    </Layout>
  )
}
