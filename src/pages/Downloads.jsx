import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DB, fmt } from '../lib/db'
import { Layout } from '../components/Layout'
import { Panel, Spinner } from '../components/UI'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '../config/branding'
import { Search, Zap, Lock, History, Download, Printer, FileText, Landmark } from 'lucide-react'
import { uid } from '../lib/db'

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

// ── DETAILED PDF GENERATOR ────────────────────────────────────────
async function generateDetailedPDF(label, type, entries, emps, advances, shortages, allWeekly, allMonthly, wd) {
  const doc = new jsPDF('l', 'mm', 'a4') // Landscape for many columns
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  
  // Header
  doc.setFontSize(22)
  doc.setTextColor(31, 56, 100) // #1F3864
  doc.text(BRAND.name, 14, 20)
  
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${BRAND.address} | ${BRAND.tagline}`, 14, 26)
  
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text(`DETAILED PAYROLL REPORT — ${label.toUpperCase()}`, 14, 38)
  
  doc.setFontSize(9)
  doc.text(`Type: ${type.toUpperCase()} Payroll Cycle`, 14, 43)
  doc.text(`Generated On: ${today}`, 283, 43, { align: 'right' })

  const tableData = entries.map((entry, i) => {
    const emp = emps.find(e => e.name === entry.name)
    const ap = type === 'weekly' 
      ? DB.advPending(entry.name, advances, allWeekly)
      : DB.advPendingMonthly(entry.name, advances, allMonthly)
    const sp = type === 'weekly'
      ? DB.shrPending(entry.name, shortages, allWeekly)
      : DB.shrPendingMonthly(entry.name, shortages, allMonthly)
    
    const salary = Math.round(type === 'weekly' 
      ? DB.weekSalary(entry, emp, wd)
      : DB.monthlySalary(entry, emp, wd))

    return [
      i + 1,
      entry.name,
      emp?.salary || 0,
      entry.days_worked || 0,
      entry.leaves || 0,
      entry.adv_deducted || 0,
      entry.shr_deducted || 0,
      ap,
      sp,
      salary
    ]
  })

  autoTable(doc, {
    startY: 48,
    head: [['S.No', 'Employee Name', 'Gross Salary', 'Days', 'Leaves', 'Adv Ded', 'Shr Ded', 'Adv Pend', 'Shr Pend', 'Net Salary']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [31, 56, 100], textColor: 255, fontSize: 9, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 45 },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right', textColor: [244, 67, 54] },
      6: { halign: 'right', textColor: [244, 67, 54] },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold', textColor: [0, 103, 255] }
    },
    didDrawPage: (data) => {
      doc.setFontSize(8)
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, 283, 205, { align: 'right' })
    }
  })

  doc.save(`${label.replace(/\s+/g, '-')}-Detailed-Report.pdf`)
}

// ── DOWNLOADS PAGE ────────────────────────────────────────────────
export default function Downloads() {
  const [periods, setPeriods]   = useState([])
  const [mPeriods, setMPeriods] = useState([])
  const [emps, setEmps]         = useState([])
  const [bankList, setBankList] = useState([])
  const [advances, setAdvances] = useState([])
  const [shortages, setShortages] = useState([])
  const [wd, setWd]             = useState(26)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('weekly') // 'weekly' or 'monthly'

  const [downloading, setDownloading] = useState(null) // period id being downloaded
  const [printing, setPrinting]       = useState(null) // period id being printed
  const [detailed, setDetailed]       = useState(null) // period id being detailed-downloaded
  
  const [weeklyMap, setWeeklyMap]     = useState({})   // periodId → entries[]
  const [monthlyMap, setMonthlyMap]   = useState({})   // periodId → entries[]
  const [allWeekly, setAllWeekly]     = useState([])
  const [allMonthly, setAllMonthly]   = useState([])

  const load = useCallback(async () => {
    const [p, mp, e, b, wdays, wkly, mnthly, adv, shr] = await Promise.all([
      DB.periods(), DB.monthlyPeriods(), DB.employees(), DB.bank(), DB.getWorkingDays(), 
      DB.weekly(), DB.monthlyAll(), DB.advances(), DB.shortages()
    ])
    
    // Group weekly entries by period_id
    const wMap = {}
    wkly.forEach(w => {
      if (!wMap[w.period_id]) wMap[w.period_id] = []
      wMap[w.period_id].push(w)
    })
    
    // Group monthly entries by period_id
    const mMap = {}
    mnthly.forEach(m => {
      if (!mMap[m.period_id]) mMap[m.period_id] = []
      mMap[m.period_id].push(m)
    })

    const closedW = p.filter(x => x.status === 'closed').sort((a, b) => new Date(b.date_from) - new Date(a.date_from))
    const closedM = mp.filter(x => x.status === 'closed').sort((a, b) => new Date(b.date_from) - new Date(a.date_from))
    
    setPeriods(closedW); setMPeriods(closedM); setEmps(e); setBankList(b); setWd(wdays); 
    setWeeklyMap(wMap); setMonthlyMap(mMap); setAllWeekly(wkly); setAllMonthly(mnthly);
    setAdvances(adv); setShortages(shr);
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleBankDownload = async (period, type) => {
    const map = type === 'weekly' ? weeklyMap : monthlyMap
    const entries = map[period.id] || []
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

  const handlePrint = async (period, type) => {
    const map = type === 'weekly' ? weeklyMap : monthlyMap
    const entries = map[period.id] || []
    if (!entries.length) { toast.error('No entries found for this period'); return }
    setPrinting(period.id)
    openPrintWindow(period.label, entries, emps, bankList, wd)
    setTimeout(() => setPrinting(null), 1000)
  }

  const handleDetailedDownload = async (period, type) => {
    const map = type === 'weekly' ? weeklyMap : monthlyMap
    const entries = map[period.id] || []
    if (!entries.length) { toast.error('No entries found for this period'); return }
    setDetailed(period.id)
    try {
      await generateDetailedPDF(period.label, type, entries, emps, advances, shortages, allWeekly, allMonthly, wd)
      toast.success('Detailed PDF Report Downloaded!')
    } catch (e) {
      toast.error('Failed: ' + e.message)
    }
    setDetailed(null)
  }

  if (loading) return <Layout title="📥 Downloads"><Spinner /></Layout>

  const currentPeriods = tab === 'weekly' ? periods : mPeriods
  const currentMap     = tab === 'weekly' ? weeklyMap : monthlyMap

  return (
    <Layout title="📥 Downloads">
      {/* Header info */}
      <div style={{ background: 'linear-gradient(135deg,#1F3864,#2E75B6)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>📥 Payroll Downloads</div>
            <div style={{ fontSize: 13, opacity: .75 }}>
              Download bank files, print sheets, and detailed reports for past payrolls.
            </div>
          </div>
          <div className="flex-gap" style={{ background: 'rgba(0,0,0,.2)', padding: 4, borderRadius: 10 }}>
            <button 
              className={`btn btn-sm ${tab === 'weekly' ? '' : 'btn-ghost'}`} 
              style={{ background: tab === 'weekly' ? '#fff' : 'transparent', color: tab === 'weekly' ? '#1F3864' : '#fff' }}
              onClick={() => setTab('weekly')}
            >📅 Weekly</button>
            <button 
              className={`btn btn-sm ${tab === 'monthly' ? '' : 'btn-ghost'}`} 
              style={{ background: tab === 'monthly' ? '#fff' : 'transparent', color: tab === 'monthly' ? '#1F3864' : '#fff' }}
              onClick={() => setTab('monthly')}
            >🟣 Monthly</button>
          </div>
        </div>
      </div>

      {currentPeriods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--mid)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No closed {tab} payrolls yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Close a {tab} payroll period to see downloads here</div>
        </div>
      ) : (
        <Panel noPad title={`${tab === 'weekly' ? '📅' : '🟣'} ${tab.charAt(0).toUpperCase() + tab.slice(1)} Payroll Periods — ${currentPeriods.length} closed`}>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Month</th>
                  <th>Date Range</th>
                  <th style={{ textAlign: 'center' }}>Emps</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Detailed Report</th>
                  <th style={{ textAlign: 'center' }}>Other Downloads</th>
                </tr>
              </thead>
              <tbody>
                {currentPeriods.map(p => {
                  const entries = currentMap[p.id] || []
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.label}</strong></td>
                      <td><span className={`badge ${tab === 'weekly' ? 'badge-blue' : 'badge-purple'}`} style={tab === 'monthly' ? {background:'#f3e8ff', color:'#7c3aed'} : {}}>{p.month_name}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--mid)' }}>
                        {new Date(p.date_from).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(p.date_to).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        {entries.length}
                      </td>
                      <td style={{ textAlign: 'right' }} className="amt amt-green">
                        <strong>{fmt(p.total_payroll || 0)}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#059669', color: '#fff', gap: 6 }}
                          onClick={() => handleDetailedDownload(p, tab)}
                          disabled={detailed === p.id}
                        >
                          {detailed === p.id ? '⏳' : '📄'} {detailed === p.id ? '...' : 'Detailed PDF'}
                        </button>
                      </td>
                      <td>
                        <div className="flex-gap" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#1F3864', color: '#fff', padding: '6px 10px' }}
                            onClick={() => handleBankDownload(p, tab)}
                            disabled={downloading === p.id}
                            title="Download Bank Transfer Excel"
                          >
                            {downloading === p.id ? '⏳' : '🏦 Bank'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handlePrint(p, tab)}
                            disabled={printing === p.id}
                            style={{ padding: '6px 10px' }}
                          >
                            {printing === p.id ? '⏳' : '🖨️ Print'}
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

      <div style={{ background: 'var(--grey)', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: 'var(--mid)', marginTop: 8 }}>
        <strong style={{ color: 'var(--navy)' }}>📌 Note:</strong> <strong>Detailed PDF</strong> contains all audit columns including Days, Leaves, Deductions, and Pending balances. 
        <strong>Bank Excel</strong> is for SBI bulk upload.
      </div>
    </Layout>
  )
}

