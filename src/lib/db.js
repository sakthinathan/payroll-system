// ── Supabase config ──────────────────────────────────────────────
const SUPA_URL = 'https://xzoawoypsldhoucmcuqk.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6b2F3b3lwc2xkaG91Y21jdXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDI0ODEsImV4cCI6MjA4OTA3ODQ4MX0._Z8ZF8aHLr4HwQzVToe3w_sSDht4oTOHlOK86Oarhok'

const H = {
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
}

async function q(method, table, body = null, qs = '') {
  const url = `${SUPA_URL}/rest/v1/${table}${qs}`
  const opts = { method, headers: { ...H } }
  if (body) opts.body = JSON.stringify(body)
  if (method === 'GET') delete opts.headers['Prefer']
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(await res.text())
  const txt = await res.text()
  return txt ? JSON.parse(txt) : []
}

export const uid = () => 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
export const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── DB API ────────────────────────────────────────────────────────
export const DB = {
  // Employees
  employees:       ()      => q('GET', 'employees', null, '?order=name'),
  saveEmployee:    emp     => q('POST', 'employees', { id: emp.id, name: emp.name, salary: emp.salary }),
  updateEmployee:  emp     => q('PATCH', 'employees', { name: emp.name, salary: emp.salary }, `?id=eq.${emp.id}`),
  deleteEmployee:  id      => q('DELETE', 'employees', null, `?id=eq.${id}`),

  // Weekly entries
  weekly:          ()      => q('GET', 'weekly_entries', null, '?order=created_at.desc'),
  weeklyByPeriod:  pid     => q('GET', 'weekly_entries', null, `?period_id=eq.${pid}&order=name`),
  saveWeekly:      e       => q('POST', 'weekly_entries', {
    id: e.id, name: e.name, week_label: e.weekLabel, date: e.date || null,
    days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
    adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
    period_id: e.periodId || null
  }),
  updateWeekly:    e       => q('PATCH', 'weekly_entries', {
    name: e.name, week_label: e.weekLabel, date: e.date || null,
    days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
    adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
  }, `?id=eq.${e.id}`),
  deleteWeekly:    id      => q('DELETE', 'weekly_entries', null, `?id=eq.${id}`),

  // Advances
  advances:        ()      => q('GET', 'advances', null, '?order=date.desc'),
  saveAdvance:     a       => q('POST', 'advances', { id: a.id, name: a.name, date: a.date || null, amount: a.amount, remarks: a.remarks || '' }),
  deleteAdvance:   id      => q('DELETE', 'advances', null, `?id=eq.${id}`),

  // Shortages
  shortages:       ()      => q('GET', 'shortages', null, '?order=date.desc'),
  saveShortage:    s       => q('POST', 'shortages', { id: s.id, name: s.name, date: s.date || null, amount: s.amount, remarks: s.remarks || '' }),
  deleteShortage:  id      => q('DELETE', 'shortages', null, `?id=eq.${id}`),

  // Bank
  bank:            ()      => q('GET', 'bank_accounts', null, '?order=name'),
  upsertBank:      b       => {
    const headers2 = { ...H, 'Prefer': 'resolution=merge-duplicates,return=representation' }
    return fetch(`${SUPA_URL}/rest/v1/bank_accounts`, { method: 'POST', headers: headers2, body: JSON.stringify(b) })
  },
  deleteBank:      name    => q('DELETE', 'bank_accounts', null, `?name=eq.${encodeURIComponent(name)}`),

  // Settings
  getSetting:      async key => { const r = await q('GET', 'settings', null, `?key=eq.${key}`); return r[0]?.value ?? null },
  setSetting:      (key, value) => {
    const headers2 = { ...H, 'Prefer': 'resolution=merge-duplicates,return=representation' }
    return fetch(`${SUPA_URL}/rest/v1/settings`, { method: 'POST', headers: headers2, body: JSON.stringify({ key, value: String(value) }) })
  },
  getWorkingDays:  async ()    => { const v = await DB.getSetting('working_days'); return v ? Number(v) : 26 },
  setWorkingDays:  n           => DB.setSetting('working_days', n),

  // Payroll Periods
  periods:         ()      => q('GET', 'payroll_periods', null, '?order=date_from.desc'),
  openPeriod:      async () => { const r = await q('GET', 'payroll_periods', null, '?status=eq.open&order=created_at.desc&limit=1'); return r[0] || null },
  savePeriod:      p       => q('POST', 'payroll_periods', p),
  closePeriod:     (id, total) => q('PATCH', 'payroll_periods', { status: 'closed', closed_at: new Date().toISOString(), total_payroll: total }, `?id=eq.${id}`),
  reopenPeriod:    id      => q('PATCH', 'payroll_periods', { status: 'open', closed_at: null }, `?id=eq.${id}`),

  // Computed helpers
  perDay:              (emp, wd)             => emp.salary / (wd || 26),
  totalAdvGiven:       (name, advances)      => advances.filter(a => a.name === name).reduce((s, a) => s + Number(a.amount), 0),
  totalShrGiven:       (name, shortages)     => shortages.filter(a => a.name === name).reduce((s, a) => s + Number(a.amount), 0),
  totalAdvDeducted:    (name, weekly)        => weekly.filter(w => w.name === name).reduce((s, w) => s + Number(w.adv_deducted || 0), 0),
  totalShrDeducted:    (name, weekly)        => weekly.filter(w => w.name === name).reduce((s, w) => s + Number(w.shr_deducted || 0), 0),
  advPending:          (name, adv, wkly)     => DB.totalAdvGiven(name, adv) - DB.totalAdvDeducted(name, wkly),
  shrPending:          (name, shr, wkly)     => DB.totalShrGiven(name, shr) - DB.totalShrDeducted(name, wkly),
  weekSalary:          (entry, emp, wd)      => {
    if (!emp) return 0
    const pd = DB.perDay(emp, wd)
    const days = Number(entry.days_worked || 0) - Number(entry.leaves || 0)
    return Math.max(0, pd * days - Number(entry.adv_deducted || 0) - Number(entry.shr_deducted || 0))
  },

  // Auth (localStorage)
  AUTH_KEY: 'prl_auth_users',
  getUsers: () => { try { const u = JSON.parse(localStorage.getItem('prl_auth_users')); if (u?.length) return u } catch {} return [{ username: 'admin', password: btoa('thulir123'), role: 'admin' }] },
  saveUsers: u => localStorage.setItem('prl_auth_users', JSON.stringify(u)),

  // Seed
  async seed() {
    const existing = await DB.employees()
    if (existing.length) return
    const names = [
      ["KRISHNAMOORTHI R",17500],["HARIKRISHNAN KUMAR",17500],["RAJU P",17000],
      ["NAGARAJ SHANMUGAM",18000],["DHATCHINAMOORTHI N",18000],["MANIKANDAN GOVINTHARAJ",17000],
      ["RAVIKUMAR MURUGESAN",17000],["MOHANDHAS ARUNACHALAM",17500],["MANJULA NAMASIVAYAM",15000],
      ["KANNITAMIL MARAN K",17500],["ARUN KUMAR S",18500],["RAJESH S",20000],
      ["MANIKANDAN A",18500],["PARAMASIVAM R",18000],["SEKAR M",17500],
      ["THAMBIKALYANAM",18500],["KARTHIKEYANI R",17500],["BOOPATHY K",17500],
      ["GOKUL V",17000],["SYED MUSTHAFA A",17000],["VIKNESH MATHESH",16000],
      ["SELVI THANGAMANI",17000],["SARANYA P",18000],["MATHI",18000],
      ["KEERTHANA S",20000],["SIVAPRASANTH GOVINDARAJ",16500],
    ]
    for (const [name, salary] of names) {
      await DB.saveEmployee({ id: uid(), name, salary })
    }
  }
}
