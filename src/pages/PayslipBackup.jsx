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
          <div className="payslip">
            <div className="payslip-header">
              <h2>THULIR AGENCY</h2>
              <p>Perundurai Road, Erode</p>
              <div className="payslip-badge">SALARY SLIP — {selWeek || 'All Weeks'}</div>
            </div>
            <div className="payslip-body">
              <div className="payslip-info">
                <div className="info-row"><div className="info-label">Employee</div><strong>{emp.name}</strong></div>
                <div className="info-row"><div className="info-label">Monthly Salary</div><strong>{fmt(emp.salary)}</strong></div>
                <div className="info-row"><div className="info-label">Per Day Rate</div><strong>{fmt(pd.toFixed(2))}</strong></div>
                <div className="info-row"><div className="info-label">Days Worked</div><strong>{totalDays} days</strong></div>
                <div className="info-row"><div className="info-label">Bank · A/C</div><strong>{bank.bank || '—'} · {bank.acc || '—'}</strong></div>
                <div className="info-row"><div className="info-label">IFSC</div><strong>{bank.ifsc || '—'}</strong></div>
              </div>
              <div className="payslip-tables">
                <div className="payslip-table earn">
                  <h4>EARNINGS</h4>
                  <table>
                    <tbody>
                      <tr><td>Salary Earned</td><td>{fmt(earned)}</td></tr>
                      <tr style={{ borderTop: '2px solid #e2e8f0' }}><td><strong>GROSS</strong></td><td><strong>{fmt(earned)}</strong></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="payslip-table deduct">
                  <h4>DEDUCTIONS</h4>
                  <table>
                    <tbody>
                      <tr><td>Advance Deducted</td><td>{fmt(totalAdv)}</td></tr>
                      <tr><td>Shortage Deducted</td><td>{fmt(totalShr)}</td></tr>
                      <tr style={{ borderTop: '2px solid #e2e8f0' }}><td><strong>TOTAL</strong></td><td><strong>{fmt(totalAdv + totalShr)}</strong></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="payslip-total">
                <div><div className="label">NET PAY (Take Home)</div><div style={{ fontSize: 11, opacity: .7 }}>After all deductions</div></div>
                <div className="amount">{fmt(netPay)}</div>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'var(--mid)' }}>Computer-generated payslip · No signature required</div>

              {/* WhatsApp + Print */}
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={shareWhatsApp}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: '0 4px 12px rgba(37,211,102,.4)' }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Share on WhatsApp
                </button>
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
