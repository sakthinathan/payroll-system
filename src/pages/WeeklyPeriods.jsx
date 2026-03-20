import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt, uid } from '../lib/db'
import { Layout } from '../components/Layout'
import { Modal, Confirm, Panel, Spinner, Field } from '../components/UI'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── PAYROLL PERIODS (Archive page) ───────────────────────────────
export function Periods() {
  const [periods, setPeriods]         = useState([])
  const [emps, setEmps]               = useState([])
  const [wd, setWd]                   = useState(26)
  const [loading, setLoading]         = useState(true)
  const [viewModal, setViewModal]     = useState(null)
  const [viewEntries, setViewEntries] = useState([])

  const load = useCallback(async () => {
    const [p, e, w] = await Promise.all([DB.periods(), DB.employees(), DB.getWorkingDays()])
    setPeriods(p); setEmps(e); setWd(w); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const open   = periods.find(p => p.status === 'open')
  const closed = periods.filter(p => p.status === 'closed')

  const reopen = async (p) => {
    if (open && open.id !== p.id) { toast.error(`"${open.label}" is active. Close it first.`); return }
    await DB.reopenPeriod(p.id)
    toast.success(`"${p.label}" reopened`)
    load()
  }

  const viewPeriod = async (p) => {
    const entries = await DB.weeklyByPeriod(p.id)
    setViewEntries(entries)
    setViewModal(p)
  }

  if (loading) return <Layout title="📆 Payroll Periods"><Spinner /></Layout>

  return (
    <Layout title="📆 Payroll Periods">
      {open ? (
        <div style={{ background: 'linear-gradient(135deg,#1F3864,#2E75B6)', borderRadius: 14, padding: '22px 26px', marginBottom: 24, color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: .6, marginBottom: 6 }}>🟢 Currently Active Period</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{open.label}</div>
          <div style={{ opacity: .65, fontSize: 13, marginTop: 4 }}>
            📅 {new Date(open.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} → {new Date(open.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
          </div>
        </div>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px dashed #86efac', borderRadius: 14, padding: '22px 26px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📆</div>
          <div style={{ fontWeight: 700, color: '#166534', fontSize: 15, marginBottom: 4 }}>No Active Payroll Period</div>
          <div style={{ color: '#15803d', fontSize: 13 }}>Start a new period from the Weekly Entry page</div>
        </div>
      )}

      <Panel noPad title="📁 Completed Payrolls Archive" subtitle={`${closed.length} periods`}>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Period</th><th>Month</th><th>Dates</th><th>Closed On</th><th>Total Payroll</th><th>Actions</th></tr></thead>
            <tbody>
              {closed.length ? closed.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.label}</strong></td>
                  <td><span className="badge badge-blue">{p.month_name}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {new Date(p.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(p.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {p.closed_at ? new Date(p.closed_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td className="amt amt-green"><strong>{fmt(p.total_payroll || 0)}</strong></td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-ghost btn-sm" onClick={() => viewPeriod(p)}>👁️ View</button>
                      <button className="btn btn-sm" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => reopen(p)}>🔓 Reopen</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No completed payrolls yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {viewModal && (
        <Modal title={`📁 ${viewModal.label}`} onClose={() => setViewModal(null)} wide>
          <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 16 }}>
            {viewEntries.length} entries · Total: <strong className="amt-green">{fmt(viewModal.total_payroll || 0)}</strong>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Days</th><th>Leaves</th><th>Adv Ded</th><th>Shr Ded</th><th>Salary</th></tr></thead>
              <tbody>
                {viewEntries.map(w => {
                  const emp = emps.find(e => e.name === w.name)
                  return (
                    <tr key={w.id}>
                      <td><strong style={{ fontSize: 12 }}>{w.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{w.days_worked || 0}</td>
                      <td style={{ textAlign: 'center' }}>{w.leaves || 0}</td>
                      <td className="amt amt-red">{fmt(w.adv_deducted || 0)}</td>
                      <td className="amt amt-red">{fmt(w.shr_deducted || 0)}</td>
                      <td className="amt amt-green"><strong>{fmt(DB.weekSalary(w, emp, wd))}</strong></td>
                    </tr>
                  )
                })}
                <tr style={{ background: 'var(--navy)', color: '#fff', fontWeight: 700 }}>
                  <td colSpan={5}>TOTAL</td>
                  <td className="amt" style={{ color: '#86efac', fontFamily: 'var(--mono)' }}>{fmt(viewModal.total_payroll || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

// ── INLINE EDITABLE CELL ─────────────────────────────────────────
function InlineCell({ value, onSave, min = 0, max, color }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)
  useEffect(() => { setVal(value) }, [value])
  const commit = () => {
    setEditing(false)
    const num = Number(val)
    if (num !== value) onSave(num)
  }
  if (editing) {
    return (
      <input type="number" min={min} max={max} value={val} autoFocus
        onChange={e => setVal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
        style={{ width: 68, textAlign: 'center', padding: '4px 6px', border: '2px solid var(--blue)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, outline: 'none', background: '#eff6ff' }}
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)} title="Click to edit"
      style={{ cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: color || 'inherit', padding: '4px 10px', borderRadius: 6, display: 'inline-block', border: '1.5px dashed transparent', transition: 'all .15s', minWidth: 40, textAlign: 'center' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = '#eff6ff' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
    >{value}</span>
  )
}

// ── EXCEL DOWNLOAD ────────────────────────────────────────────────
function downloadPayrollExcel(label, entries, emps, wd) {
  const rows = []
  rows.push(['THULIR AGENCY — PAYROLL'])
  rows.push([label])
  rows.push([`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`])
  rows.push([])
  rows.push(['S.No', 'Employee Name', 'Net Salary (₹)'])
  let total = 0
  entries.forEach((w, i) => {
    const emp = emps.find(e => e.name === w.name)
    const salary = Math.round(DB.weekSalary(w, emp, wd))
    total += salary
    rows.push([i + 1, w.name, salary])
  })
  rows.push([])
  rows.push(['', 'TOTAL', total])
  const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${label.replace(/\s+/g, '-')}-Payroll.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── PRINT PAYROLL SHEET ───────────────────────────────────────────
function PrintPayrollSheet({ label, entries, emps, bankList, wd, onClose }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  let grandTotal = 0
  const rows = entries.map((w, i) => {
    const emp    = emps.find(e => e.name === w.name)
    const bank   = bankList.find(b => b.name === w.name) || {}
    const salary = Math.round(DB.weekSalary(w, emp, wd))
    grandTotal  += salary
    return { i: i + 1, name: w.name, bank: bank.bank || '—', acc: bank.acc || '—', ifsc: bank.ifsc || '—', salary }
  })

  const print = () => window.print()

  return (
    <>
      {/* Print styles injected into head */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-sheet, #print-sheet * { visibility: visible !important; }
          #print-sheet { position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; background: #fff; }
          #print-no-print { display: none !important; }
        }
      `}</style>

      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal modal-wide" style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>

          {/* Action buttons — hidden on print */}
          <div id="print-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>🖨️ Print Payroll Sheet — {label}</h3>
            <div className="flex-gap">
              <button className="btn btn-primary" onClick={print}>🖨️ Print</button>
              <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {/* Printable sheet */}
          <div id="print-sheet" style={{ background: '#fff', fontFamily: 'Arial, sans-serif' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '3px double #1F3864', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1F3864', letterSpacing: 1 }}>THULIR AGENCY</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Perundurai Road, Erode</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: '#1F3864' }}>SALARY PAYMENT SHEET — {label.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>Date: {today}</div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#1F3864', color: '#fff' }}>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'center', width: 32 }}>S.No</th>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'left' }}>Employee Name</th>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'center' }}>Bank</th>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'center' }}>Account No.</th>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'center' }}>IFSC</th>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'right', width: 90 }}>Net Salary (₹)</th>
                  <th style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'center', width: 90 }}>Signature</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.name} style={{ background: idx % 2 === 0 ? '#f9fbff' : '#fff' }}>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd', textAlign: 'center', color: '#555' }}>{r.i}</td>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd', textAlign: 'center', color: '#555' }}>{r.bank}</td>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', fontSize: 11 }}>{r.acc}</td>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', fontSize: 11 }}>{r.ifsc}</td>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                      {r.salary.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '7px 6px', border: '1px solid #ddd' }}></td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background: '#1F3864', color: '#fff', fontWeight: 700 }}>
                  <td colSpan={5} style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'right', fontSize: 12 }}>GRAND TOTAL</td>
                  <td style={{ padding: '8px 6px', border: '1px solid #ccc', textAlign: 'right', fontSize: 13, color: '#86efac' }}>
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 11 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: 6, marginTop: 24 }}>Prepared By</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: 6, marginTop: 24 }}>Checked By</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: 6, marginTop: 24 }}>Authorised By</div>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 10, color: '#aaa', borderTop: '1px solid #eee', paddingTop: 8 }}>
              Computer generated payroll sheet · Thulir Agency · {today}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── WHATSAPP BULK SENDER ──────────────────────────────────────────
function WhatsAppBulkModal({ label, entries, emps, bankList, wd, onClose }) {
  const [current, setCurrent] = useState(0)
  const [sent, setSent]       = useState(new Set())

  const rows = entries.map(w => {
    const emp    = emps.find(e => e.name === w.name)
    const bank   = bankList.find(b => b.name === w.name) || {}
    const salary = Math.round(DB.weekSalary(w, emp, wd))
    return { ...w, bank, salary, phone: bank.phone || '' }
  })

  const withPhone    = rows.filter(r => r.phone)
  const withoutPhone = rows.filter(r => !r.phone)

  const buildMsg = (r) => [
    `🏢 *THULIR AGENCY*`,
    `📍 Perundurai Road, Erode`,
    ``,
    `📄 *SALARY SLIP — ${label}*`,
    ``,
    `👤 *${r.name}*`,
    `✅ *Days Worked:* ${Number(r.days_worked || 0) - Number(r.leaves || 0)} days`,
    `💸 *Advance Deducted:* ₹${Number(r.adv_deducted || 0).toLocaleString('en-IN')}`,
    `⚠️ *Shortage Deducted:* ₹${Number(r.shr_deducted || 0).toLocaleString('en-IN')}`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    `💰 *NET SALARY: ₹${r.salary.toLocaleString('en-IN')}*`,
    `━━━━━━━━━━━━━━━━`,
    ``,
    `🏦 *Bank:* ${r.bank.bank || '—'}`,
    `🔢 *A/C:* ${r.bank.acc || '—'}`,
    `📋 *IFSC:* ${r.bank.ifsc || '—'}`,
    ``,
    `_Thulir Agency Payroll System_`,
  ].join('\n')

  const sendNext = () => {
    const row = withPhone[current]
    if (!row) return
    const msg = buildMsg(row)
    const url = `https://wa.me/91${row.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setSent(s => new Set([...s, row.name]))
    if (current + 1 < withPhone.length) setCurrent(c => c + 1)
  }

  const sendAll = () => {
    // Open first unsent
    const nextIdx = withPhone.findIndex(r => !sent.has(r.name))
    if (nextIdx === -1) return
    setCurrent(nextIdx)
    const row = withPhone[nextIdx]
    const msg = buildMsg(row)
    const url = `https://wa.me/91${row.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setSent(s => new Set([...s, row.name]))
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h3>📱 WhatsApp Bulk Notification — {label}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#166534' }}>{withPhone.length}</div>
            <div style={{ fontSize: 11, color: '#15803d' }}>With Phone</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{sent.size}</div>
            <div style={{ fontSize: 11, color: 'var(--blue)' }}>Sent</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e' }}>{withPhone.length - sent.size}</div>
            <div style={{ fontSize: 11, color: '#92400e' }}>Remaining</div>
          </div>
        </div>

        {/* Send next button */}
        {withPhone.length > 0 && sent.size < withPhone.length && (
          <button onClick={sendAll}
            style={{ width: '100%', padding: '13px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send Next — {withPhone.find(r => !sent.has(r.name))?.name || 'All Sent!'}
          </button>
        )}

        {sent.size === withPhone.length && withPhone.length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 16px', textAlign: 'center', marginBottom: 16, color: '#166534', fontWeight: 600 }}>
            ✅ All {withPhone.length} messages sent!
          </div>
        )}

        {/* Employee list */}
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--navy)', color: '#fff', position: 'sticky', top: 0 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Salary</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Phone</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Send</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.name} style={{ borderBottom: '1px solid #f0f0f0', background: sent.has(r.name) ? '#f0fdf4' : idx % 2 === 0 ? '#fafbff' : '#fff' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', color: '#166534', fontWeight: 700 }}>₹{r.salary.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>
                    {r.phone ? r.phone : <span style={{ color: '#ef4444', fontSize: 11 }}>No phone</span>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {sent.has(r.name)
                      ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 11 }}>✅ Sent</span>
                      : r.phone
                        ? <span style={{ color: '#f59e0b', fontSize: 11 }}>Pending</span>
                        : <span style={{ color: '#ef4444', fontSize: 11 }}>No phone</span>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {r.phone && !sent.has(r.name) && (
                      <button onClick={() => {
                        const msg = buildMsg(r)
                        window.open(`https://wa.me/91${r.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
                        setSent(s => new Set([...s, r.name]))
                      }}
                        style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        📱 Send
                      </button>
                    )}
                    {sent.has(r.name) && (
                      <button onClick={() => {
                        const msg = buildMsg(r)
                        window.open(`https://wa.me/91${r.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
                      }}
                        style={{ background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                        🔁 Resend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {withoutPhone.length > 0 && (
          <div style={{ marginTop: 12, background: '#fef3c7', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#92400e' }}>
            ⚠️ {withoutPhone.length} employees have no phone number: {withoutPhone.map(r => r.name).join(', ')}. Add phone in Bank Master.
          </div>
        )}
      </div>
    </div>
  )
}

// ── WEEKLY ENTRY ─────────────────────────────────────────────────
export function Weekly() {
  const [allWeekly, setAllWeekly]       = useState([])
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
  const [bulkForm, setBulkForm]         = useState({ daysWorked: 6, leaves: 0, advDeducted: 0, shrDeducted: 0 })
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saving, setSaving]             = useState(null)
  const [showPrint, setShowPrint]       = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [closedData, setClosedData]     = useState(null) // stores data after close for print/WA

  const now = new Date()
  const [newPeriod, setNewPeriod] = useState({
    month: now.getMonth(), year: now.getFullYear(), weekNum: 1, label: '', dateFrom: '', dateTo: ''
  })

  useEffect(() => {
    const { month, year, weekNum } = newPeriod
    const ranges = [[1,7],[8,14],[15,21],[22,28],[29,null]]
    const [dayFrom, dayTo] = ranges[weekNum - 1]
    const lastDay = new Date(year, month + 1, 0).getDate()
    const pad = n => String(n).padStart(2, '0')
    const from = `${year}-${pad(month+1)}-${pad(dayFrom)}`
    const to   = `${year}-${pad(month+1)}-${pad(dayTo || lastDay)}`
    setNewPeriod(p => ({ ...p, dateFrom: from, dateTo: to, label: `${MONTHS[month]} Week ${weekNum}` }))
  }, [newPeriod.month, newPeriod.year, newPeriod.weekNum])

  const load = useCallback(async () => {
    const [w, e, a, s, wdays, ap, b] = await Promise.all([
      DB.weekly(), DB.employees(), DB.advances(), DB.shortages(), DB.getWorkingDays(), DB.openPeriod(), DB.bank()
    ])
    const periodEntries = ap ? w.filter(x => x.period_id === ap.id) : []
    setAllWeekly(periodEntries); setEmps(e); setAdvances(a); setShortages(s)
    setWd(wdays); setActivePeriod(ap); setBankList(b); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const enteredNames = new Set(allWeekly.map(w => w.name))
  const pendingEmps  = emps.filter(e => !enteredNames.has(e.name))
  const totalPay     = allWeekly.reduce((s, w) => s + DB.weekSalary(w, emps.find(e => e.name === w.name), wd), 0)
  const filtered     = allWeekly.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()))

  const inlineSave = async (entry, field, newVal) => {
    setSaving(entry.id)
    await DB.updateWeekly({
      id: entry.id, name: entry.name,
      weekLabel: entry.week_label, date: entry.date, periodId: entry.period_id,
      daysWorked:  field === 'days_worked'  ? newVal : entry.days_worked,
      leaves:      field === 'leaves'       ? newVal : entry.leaves,
      advDeducted: field === 'adv_deducted' ? newVal : entry.adv_deducted,
      shrDeducted: field === 'shr_deducted' ? newVal : entry.shr_deducted,
    })
    toast.success('Saved ✅', { duration: 1000 })
    setSaving(null); load()
  }

  const quickAdd = async (emp) => {
    await DB.saveWeekly({ id: uid(), name: emp.name, weekLabel: activePeriod.label, date: activePeriod.date_from, daysWorked: 6, leaves: 0, advDeducted: 0, shrDeducted: 0, periodId: activePeriod.id })
    toast.success(`${emp.name} added ✅`, { duration: 1000 }); load()
  }

  const bulkAdd = async () => {
    for (const emp of pendingEmps) {
      await DB.saveWeekly({ id: uid(), name: emp.name, weekLabel: activePeriod.label, date: activePeriod.date_from, ...bulkForm, periodId: activePeriod.id })
    }
    toast.success(`${pendingEmps.length} entries added ✅`); setBulkModal(false); load()
  }

  const startPeriod = async () => {
    if (!newPeriod.dateFrom || !newPeriod.dateTo) { toast.error('Select dates'); return }
    await DB.savePeriod({ id: uid(), label: newPeriod.label, month_name: `${MONTHS[newPeriod.month]} ${newPeriod.year}`, date_from: newPeriod.dateFrom, date_to: newPeriod.dateTo, status: 'open' })
    toast.success(`✅ "${newPeriod.label}" started!`); load()
  }

  // ── Close payroll ─────────────────────────────────────────────
  const closePayroll = async () => {
    await DB.closePeriod(activePeriod.id, totalPay)
    // Save closed data for print/whatsapp use
    setClosedData({ label: activePeriod.label, entries: [...allWeekly] })
    // Auto download Excel
    downloadPayrollExcel(activePeriod.label, allWeekly, emps, wd)
    toast.success(`✅ "${activePeriod.label}" closed! Excel downloaded 📥`)
    setCloseConfirm(false)
    setActivePeriod(null); setAllWeekly([])
    load()
  }

  const del = async id => { await DB.deleteWeekly(id); toast.error('Deleted'); setConfirm(null); load() }

  if (loading) return <Layout title="📅 Weekly Entry"><Spinner /></Layout>

  // ── NO ACTIVE PERIOD ──────────────────────────────────────────
  if (!activePeriod) {
    return (
      <Layout title="📅 Weekly Entry">
        {/* Post-close actions — show if just closed */}
        {closedData && (
          <div style={{ background: 'linear-gradient(135deg,#166534,#15803d)', borderRadius: 12, padding: '18px 22px', marginBottom: 20, color: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: .7, marginBottom: 4 }}>✅ Payroll Closed</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{closedData.label}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setShowPrint(true)}
                style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🖨️ Print Payroll Sheet
              </button>
              <button onClick={() => setShowWhatsApp(true)}
                style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📱 Send WhatsApp Notifications
              </button>
              <button onClick={() => setClosedData(null)}
                style={{ background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                ✕ Dismiss
              </button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>Start a New Payroll Week</div>
            <div style={{ fontSize: 14, color: 'var(--mid)' }}>Pick the month and week to begin entering attendance</div>
          </div>
          <Panel title="🟢 Start Payroll" headerColor="#166534">
            <div className="form-grid cols2" style={{ gap: 16, marginBottom: 16 }}>
              <Field label="Month">
                <select value={newPeriod.month} onChange={e => setNewPeriod(p => ({ ...p, month: Number(e.target.value) }))}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </Field>
              <Field label="Year">
                <select value={newPeriod.year} onChange={e => setNewPeriod(p => ({ ...p, year: Number(e.target.value) }))}>
                  {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Week Number">
                <select value={newPeriod.weekNum} onChange={e => setNewPeriod(p => ({ ...p, weekNum: Number(e.target.value) }))}>
                  <option value={1}>Week 1 (1st – 7th)</option>
                  <option value={2}>Week 2 (8th – 14th)</option>
                  <option value={3}>Week 3 (15th – 21st)</option>
                  <option value={4}>Week 4 (22nd – 28th)</option>
                  <option value={5}>Week 5 (29th – End)</option>
                </select>
              </Field>
              <Field label="Label">
                <input value={newPeriod.label} onChange={e => setNewPeriod(p => ({ ...p, label: e.target.value }))} placeholder="e.g. March Week 1" />
              </Field>
              <Field label="From Date">
                <input type="date" value={newPeriod.dateFrom} onChange={e => setNewPeriod(p => ({ ...p, dateFrom: e.target.value }))} />
              </Field>
              <Field label="To Date">
                <input type="date" value={newPeriod.dateTo} onChange={e => setNewPeriod(p => ({ ...p, dateTo: e.target.value }))} />
              </Field>
            </div>
            {newPeriod.dateFrom && (
              <div style={{ background: 'var(--lblue)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--navy)', marginBottom: 18 }}>
                📅 <strong>{newPeriod.label}</strong> &nbsp;·&nbsp;
                {new Date(newPeriod.dateFrom).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} to {new Date(newPeriod.dateTo).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}
              </div>
            )}
            <button className="btn btn-success" style={{ width: '100%', padding: 13, fontSize: 15, justifyContent: 'center' }} onClick={startPeriod}>
              🟢 Start Payroll — {newPeriod.label}
            </button>
          </Panel>
        </div>

        {/* Print modal */}
        {showPrint && closedData && (
          <PrintPayrollSheet label={closedData.label} entries={closedData.entries} emps={emps} bankList={bankList} wd={wd} onClose={() => setShowPrint(false)} />
        )}

        {/* WhatsApp modal */}
        {showWhatsApp && closedData && (
          <WhatsAppBulkModal label={closedData.label} entries={closedData.entries} emps={emps} bankList={bankList} wd={wd} onClose={() => setShowWhatsApp(false)} />
        )}
      </Layout>
    )
  }

  // ── ACTIVE PERIOD ─────────────────────────────────────────────
  return (
    <Layout title="📅 Weekly Entry">
      <div style={{ background: 'linear-gradient(135deg,#1F3864,#2E75B6)', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>🟢 Active Period</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 2 }}>{activePeriod.label}</div>
            <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 12, marginTop: 3 }}>
              📅 {new Date(activePeriod.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} → {new Date(activePeriod.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
              &nbsp;·&nbsp; {allWeekly.length}/{emps.length} employees &nbsp;·&nbsp; Total: {fmt(totalPay)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {pendingEmps.length > 0 && (
              <button className="btn" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }} onClick={() => setBulkModal(true)}>
                ⚡ Bulk Add ({pendingEmps.length} pending)
              </button>
            )}
            <button className="btn" style={{ background: '#dc2626', color: '#fff' }} onClick={() => setCloseConfirm(true)}>
              🔴 End Payroll
            </button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,.2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: pendingEmps.length === 0 ? '#22c55e' : '#f59e0b', width: `${(allWeekly.length / (emps.length || 1)) * 100}%`, transition: 'width .4s' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11 }}>
            {pendingEmps.length === 0
              ? <span style={{ color: '#86efac' }}>✅ All {emps.length} employees entered — ready to close!</span>
              : <span style={{ color: '#fde68a' }}>⚠️ {pendingEmps.length} employees still pending</span>}
          </div>
        </div>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#1e40af', marginBottom: 16 }}>
        💡 <strong>Click any number</strong> in Days, Leaves, Adv Ded or Shr Ded to edit directly. Press <strong>Enter</strong> or click away to save instantly.
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Panel noPad title={`Weekly Attendance — ${activePeriod.label}`} subtitle={`Working days: ${wd}`}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th style={{ textAlign: 'center' }}>Days ✏️</th>
                <th style={{ textAlign: 'center' }}>Leaves ✏️</th>
                <th style={{ textAlign: 'center' }}>Adv Ded ✏️</th>
                <th style={{ textAlign: 'center' }}>Shr Ded ✏️</th>
                <th>Adv Pending</th>
                <th>Shr Pending</th>
                <th>Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const emp = emps.find(e => e.name === w.name)
                const ap  = DB.advPending(w.name, advances, allWeekly)
                const sp  = DB.shrPending(w.name, shortages, allWeekly)
                return (
                  <tr key={w.id} style={{ opacity: saving === w.id ? 0.5 : 1, transition: 'opacity .2s' }}>
                    <td>
                      <strong style={{ fontSize: 12 }}>{w.name}</strong>
                      {saving === w.id && <span style={{ fontSize: 10, color: 'var(--blue)', marginLeft: 6 }}>saving...</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}><InlineCell value={Number(w.days_worked || 0)} max={7} onSave={v => inlineSave(w, 'days_worked', v)} /></td>
                    <td style={{ textAlign: 'center' }}><InlineCell value={Number(w.leaves || 0)} max={7} onSave={v => inlineSave(w, 'leaves', v)} /></td>
                    <td style={{ textAlign: 'center' }}><InlineCell value={Number(w.adv_deducted || 0)} onSave={v => inlineSave(w, 'adv_deducted', v)} color="var(--red)" /></td>
                    <td style={{ textAlign: 'center' }}><InlineCell value={Number(w.shr_deducted || 0)} onSave={v => inlineSave(w, 'shr_deducted', v)} color="var(--red)" /></td>
                    <td className={`amt ${ap > 0 ? 'amt-blue' : 'amt-green'}`}>{fmt(ap)}</td>
                    <td className={`amt ${sp > 0 ? 'amt-red' : 'amt-green'}`}>{fmt(sp)}</td>
                    <td className="amt amt-green"><strong>{fmt(DB.weekSalary(w, emp, wd))}</strong></td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setConfirm(w.id)}>🗑️</button></td>
                  </tr>
                )
              })}
              {pendingEmps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())).map(e => (
                <tr key={e.id} style={{ background: '#fffbeb' }}>
                  <td>
                    <strong style={{ fontSize: 12, color: 'var(--mid)' }}>{e.name}</strong>
                    <span style={{ fontSize: 10, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>Pending</span>
                  </td>
                  <td colSpan={7} style={{ color: 'var(--mid)', fontSize: 12, textAlign: 'center' }}>Not entered yet</td>
                  <td><button className="btn btn-success btn-sm" onClick={() => quickAdd(e)}>+ Add</button></td>
                </tr>
              ))}
              {!filtered.length && !pendingEmps.length && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--mid)' }}>No entries for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bulk Add Modal */}
      {bulkModal && (
        <Modal title={`⚡ Bulk Add — ${activePeriod?.label}`} onClose={() => setBulkModal(false)} onSave={bulkAdd} saveLabel={`⚡ Add All ${pendingEmps.length}`}>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 16 }}>Set default values for all {pendingEmps.length} pending employees:</p>
          <div style={{ background: 'var(--grey)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div className="form-grid cols2" style={{ gap: 12 }}>
              <Field label="Days Worked"><input type="number" min={0} max={7} value={bulkForm.daysWorked} onChange={e => setBulkForm(f => ({ ...f, daysWorked: Number(e.target.value) }))} /></Field>
              <Field label="Leaves"><input type="number" min={0} max={7} value={bulkForm.leaves} onChange={e => setBulkForm(f => ({ ...f, leaves: Number(e.target.value) }))} /></Field>
              <Field label="Advance Deducted (₹)"><input type="number" min={0} value={bulkForm.advDeducted} onChange={e => setBulkForm(f => ({ ...f, advDeducted: Number(e.target.value) }))} /></Field>
              <Field label="Shortage Deducted (₹)"><input type="number" min={0} value={bulkForm.shrDeducted} onChange={e => setBulkForm(f => ({ ...f, shrDeducted: Number(e.target.value) }))} /></Field>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Employees: <strong style={{ color: 'var(--navy)' }}>{pendingEmps.map(e => e.name).join(', ')}</strong></div>
        </Modal>
      )}

      {/* End Payroll Confirm */}
      {closeConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCloseConfirm(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h3>🔴 End Payroll — {activePeriod?.label}</h3></div>
            <div style={{ background: 'var(--grey)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--mid)', display: 'block', fontSize: 11 }}>Entries</span><strong>{allWeekly.length} / {emps.length}</strong></div>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--mid)', display: 'block', fontSize: 11 }}>Total Payroll</span><strong className="amt-green">{fmt(totalPay)}</strong></div>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--mid)', display: 'block', fontSize: 11 }}>Missing</span><strong style={{ color: pendingEmps.length > 0 ? 'var(--red)' : '#16a34a' }}>{pendingEmps.length === 0 ? '✅ None' : `${pendingEmps.length} employees`}</strong></div>
              </div>
            </div>
            {pendingEmps.length > 0 && (
              <div style={{ background: 'var(--lred)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>
                ⚠️ {pendingEmps.length} employees have no entry and will be excluded.
              </div>
            )}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 16 }}>
              📥 Excel auto-downloads · 🖨️ Print sheet & 📱 WhatsApp available after closing
            </div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>This week will be <strong>archived</strong> and the page resets for next week.</p>
            <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCloseConfirm(false)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff' }} onClick={closePayroll}>🔴 End Payroll & Download Excel</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <Confirm message="Delete this entry?" onConfirm={() => del(confirm)} onClose={() => setConfirm(null)} />}
    </Layout>
  )
}
