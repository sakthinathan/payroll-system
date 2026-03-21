import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Spinner } from '../components/UI'

// ── REMITTER DETAILS ──────────────────────────────────────────────
const REMITTER_ACC   = '33284893641'
const REMITTER_NAME  = 'THULIR AGENCY'
const REMITTER_ADDR  = 'ERODE'
const REMITTER_EMAIL = 'sbi.12777@sbi.co.in'
const SBI_IFSC_PREFIX = 'SBIN'

// ── LOAD SHEETJS ──────────────────────────────────────────────────
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload  = () => resolve(window.XLSX)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// ── BANK EXCEL GENERATOR ──────────────────────────────────────────
async function generateBankExcel(label, entries, emps, bankList, wd) {
  const XLSX    = await loadSheetJS()
  const weekCode = label.replace(/\s+/g, '').toUpperCase().slice(0, 8)
  const sbiRows  = []
  const otherRows = []
  let refSeq = 1

  entries.forEach(w => {
    const emp    = emps.find(e => e.name === w.name)
    const bank   = bankList.find(b => b.name === w.name) || {}
    const salary = Math.round(DB.weekSalary(w, emp, wd))
    if (!salary || !bank.acc) return

    const isSBI = (bank.ifsc || '').toUpperCase().startsWith(SBI_IFSC_PREFIX)
    if (isSBI) {
      sbiRows.push([w.name, bank.acc, (bank.ifsc || '').toUpperCase(), salary])
    } else {
      const refNo = `THULIRSAL${weekCode}${String(refSeq++).padStart(3, '0')}`
      otherRows.push([
        REMITTER_ACC, REMITTER_NAME, REMITTER_ADDR,
        bank.acc, w.name, REMITTER_ADDR,
        (bank.ifsc || '').toUpperCase(), 'SAL', 'ATTN',
        REMITTER_EMAIL, refNo, salary
      ])
    }
  })

  const wb = XLSX.utils.book_new()

  // SBI Sheet
  const sbiTotal = sbiRows.reduce((s, r) => s + r[3], 0)
  const sbiSheet = XLSX.utils.aoa_to_sheet([
    ['ACCOUNT HOLDER NAME', 'ACCOUNT NUMBER', 'IFSC CODE', 'NET SALERY'],
    ...sbiRows,
    [null, null, 'TOTAL', sbiTotal]
  ])
  sbiSheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, sbiSheet, 'SBI')

  // Other Bank Sheet
  const otherSheet = XLSX.utils.aoa_to_sheet([
    ['RemitterAcno','RemitterName','RemitterAddress','BenificiaryAcno','BenificiaryName','BenificiaryAddress','BenificiaryIFSC','PaymentDetails','Sender to Receiver Code (ATTN / FAST / URGENT / DETAIL / NREAC)','RemitterEmail','RefNo','Amount'],
    ...otherRows
  ])
  otherSheet['!cols'] = [
    {wch:16},{wch:16},{wch:12},{wch:20},{wch:28},{wch:12},
    {wch:14},{wch:10},{wch:18},{wch:22},{wch:18},{wch:10}
  ]
  XLSX.utils.book_append_sheet(wb, otherSheet, 'OTHER BANK')

  XLSX.writeFile(wb, `${label.replace(/\s+/g, '-')}-Bank-Transfer.xlsx`)
  return { sbiCount: sbiRows.length, otherCount: otherRows.length }
}

// ── PRINT SHEET WINDOW ─────────────────────────────────────────────
function openPrintWindow(label, entries, emps, bankList, wd) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  let grandTotal = 0
  const rows = entries.map((w, i) => {
    const emp    = emps.find(e => e.name === w.name)
    const bank   = bankList.find(b => b.name === w.name) || {}
    const salary = Math.round(DB.weekSalary(w, emp, wd))
    grandTotal  += salary
    return { i: i + 1, name: w.name, bank: bank.bank || '—', acc: bank.acc || '—', ifsc: bank.ifsc || '—', salary }
  })

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Payroll Sheet — ${label}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      h1 { text-align:center; font-size:20px; margin:0; color:#1F3864; }
      .sub { text-align:center; font-size:12px; color:#555; margin:4px 0; }
      .title { text-align:center; font-size:15px; font-weight:700; margin:10px 0 4px; color:#1F3864; }
      hr { border: 2px double #1F3864; margin: 12px 0; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      th { background:#1F3864; color:#fff; padding:8px 6px; text-align:left; border:1px solid #ccc; }
      td { padding:7px 6px; border:1px solid #ddd; }
      tr:nth-child(even) td { background:#f9fbff; }
      .total-row td { background:#1F3864; color:#fff; font-weight:700; }
      .right { text-align:right; }
      .center { text-align:center; }
      .mono { font-family:monospace; }
      .footer { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:40px; font-size:11px; text-align:center; }
      .sig { border-top:1px solid #333; padding-top:6px; margin-top:30px; }
      .watermark { text-align:center; font-size:10px; color:#aaa; margin-top:16px; border-top:1px solid #eee; padding-top:8px; }
      @media print { @page { margin:15mm; } }
    </style></head><body>
    <h1>THULIR AGENCY</h1>
    <div class="sub">Perundurai Road, Erode</div>
    <div class="title">SALARY PAYMENT SHEET — ${label.toUpperCase()}</div>
    <div class="sub">Date: ${today}</div>
    <hr/>
    <table>
      <thead><tr>
        <th style="width:32px" class="center">S.No</th>
        <th>Employee Name</th>
        <th class="center">Bank</th>
        <th class="center">Account No.</th>
        <th class="center">IFSC</th>
        <th class="right" style="width:90px">Net Salary (₹)</th>
        <th class="center" style="width:90px">Signature</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="center">${r.i}</td>
            <td><strong>${r.name}</strong></td>
            <td class="center">${r.bank}</td>
            <td class="center mono">${r.acc}</td>
            <td class="center mono">${r.ifsc}</td>
            <td class="right"><strong>${r.salary.toLocaleString('en-IN')}</strong></td>
            <td></td>
          </tr>`).join('')}
        <tr class="total-row">
          <td colspan="5" class="right">GRAND TOTAL</td>
          <td class="right">₹${grandTotal.toLocaleString('en-IN')}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="footer">
      <div><div class="sig">Prepared By</div></div>
      <div><div class="sig">Checked By</div></div>
      <div><div class="sig">Authorised By</div></div>
    </div>
    <div class="watermark">Computer generated payroll sheet · Thulir Agency · ${today}</div>
    <script>window.onload = () => { window.print() }</script>
    </body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ── DOWNLOADS PAGE ────────────────────────────────────────────────
export default function Downloads() {
  const [periods, setPeriods]   = useState([])
  const [emps, setEmps]         = useState([])
  const [bankList, setBankList] = useState([])
  const [wd, setWd]             = useState(26)
  const [loading, setLoading]   = useState(true)
  const [downloading, setDownloading] = useState(null) // period id being downloaded
  const [printing, setPrinting]       = useState(null) // period id being printed
  const [weeklyMap, setWeeklyMap]     = useState({})   // periodId → entries[]

  const load = useCallback(async () => {
    const [p, e, b, wdays, allWeekly] = await Promise.all([
      DB.periods(), DB.employees(), DB.bank(), DB.getWorkingDays(), DB.weekly()
    ])
    // Group weekly entries by period_id
    const map = {}
    allWeekly.forEach(w => {
      if (!map[w.period_id]) map[w.period_id] = []
      map[w.period_id].push(w)
    })
    const closed = p.filter(x => x.status === 'closed').sort((a, b) => new Date(b.date_from) - new Date(a.date_from))
    setPeriods(closed); setEmps(e); setBankList(b); setWd(wdays); setWeeklyMap(map); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleBankDownload = async (period) => {
    const entries = weeklyMap[period.id] || []
    if (!entries.length) { toast.error('No entries found for this period'); return }
    setDownloading(period.id)
    try {
      const result = await generateBankExcel(period.label, entries, emps, bankList, wd)
      toast.success(`Downloaded! SBI: ${result.sbiCount} | Other: ${result.otherCount}`)
    } catch (e) {
      toast.error('Failed: ' + e.message)
    }
    setDownloading(null)
  }

  const handlePrint = async (period) => {
    const entries = weeklyMap[period.id] || []
    if (!entries.length) { toast.error('No entries found for this period'); return }
    setPrinting(period.id)
    openPrintWindow(period.label, entries, emps, bankList, wd)
    setTimeout(() => setPrinting(null), 1000)
  }

  if (loading) return <Layout title="📥 Downloads"><Spinner /></Layout>

  return (
    <Layout title="📥 Downloads">
      {/* Header info */}
      <div style={{ background: 'linear-gradient(135deg,#1F3864,#2E75B6)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>📥 Payroll Downloads</div>
        <div style={{ fontSize: 13, opacity: .75 }}>
          Download bank transfer files and print sheets for any past payroll week.
          Files are generated fresh from live data each time.
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>
            🏦 <strong>Bank Transfer Excel</strong> — SBI + Other Bank sheets
          </div>
          <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>
            🖨️ <strong>Print Sheet</strong> — with signatures
          </div>
        </div>
      </div>

      {periods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--mid)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No closed payrolls yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Close a payroll period to see downloads here</div>
        </div>
      ) : (
        <Panel noPad title={`All Payroll Periods — ${periods.length} weeks`}>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Month</th>
                  <th>Date Range</th>
                  <th>Closed On</th>
                  <th style={{ textAlign: 'center' }}>Employees</th>
                  <th style={{ textAlign: 'right' }}>Total Payroll</th>
                  <th style={{ textAlign: 'center' }}>SBI</th>
                  <th style={{ textAlign: 'center' }}>Other Bank</th>
                  <th style={{ textAlign: 'center' }}>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(p => {
                  const entries   = weeklyMap[p.id] || []
                  const sbiCount  = entries.filter(w => {
                    const bank = bankList.find(b => b.name === w.name)
                    return bank && (bank.ifsc || '').toUpperCase().startsWith(SBI_IFSC_PREFIX)
                  }).length
                  const otherCount = entries.filter(w => {
                    const bank = bankList.find(b => b.name === w.name)
                    return bank && !(bank.ifsc || '').toUpperCase().startsWith(SBI_IFSC_PREFIX)
                  }).length

                  return (
                    <tr key={p.id}>
                      <td><strong>{p.label}</strong></td>
                      <td><span className="badge badge-blue">{p.month_name}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--mid)' }}>
                        {new Date(p.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(p.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--mid)' }}>
                        {p.closed_at ? new Date(p.closed_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        {entries.length}
                      </td>
                      <td style={{ textAlign: 'right' }} className="amt amt-green">
                        <strong>{fmt(p.total_payroll || 0)}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-blue">{sbiCount}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-orange">{otherCount}</span>
                      </td>
                      <td>
                        <div className="flex-gap" style={{ justifyContent: 'center' }}>
                          {/* Bank Transfer Excel */}
                          <button
                            className="btn btn-sm"
                            style={{ background: '#1F3864', color: '#fff', gap: 6 }}
                            onClick={() => handleBankDownload(p)}
                            disabled={downloading === p.id}
                            title="Download Bank Transfer Excel (SBI + Other Bank)"
                          >
                            {downloading === p.id ? '⏳' : '🏦'} {downloading === p.id ? 'Generating...' : 'Bank Excel'}
                          </button>

                          {/* Print Sheet */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handlePrint(p)}
                            disabled={printing === p.id}
                            title="Open Print Sheet"
                          >
                            {printing === p.id ? '⏳' : '🖨️'} Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Legend */}
      <div style={{ background: 'var(--grey)', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: 'var(--mid)', marginTop: 8 }}>
        <strong style={{ color: 'var(--navy)' }}>📌 Note:</strong> Files are generated fresh from current database data.
        Bank Excel has 2 sheets — <strong>SBI</strong> (IFSC starts with SBIN) and <strong>OTHER BANK</strong> (all other banks) in the exact format required for SBI bulk upload.
      </div>
    </Layout>
  )
}
