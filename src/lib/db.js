import { createClient } from '@supabase/supabase-js'

// ── Supabase Setup ────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPA_URL || !SUPA_KEY) {
  console.error('Supabase credentials missing in .env')
}

export const supabase = createClient(SUPA_URL, SUPA_KEY)

// ── Utilities ─────────────────────────────────────────────────────
export const uid = () => crypto.randomUUID()
export const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── DB API ────────────────────────────────────────────────────────
export const DB = {
  // Employees
  employees: async () => {
    const { data, error } = await supabase.from('employees').select('*').order('name')
    if (error) throw error
    return data
  },
  
  weeklyEmps: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .or('salary_type.eq.weekly,salary_type.is.null')
      .order('name')
    if (error) throw error
    return data
  },

  monthlyEmps: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('salary_type', 'monthly')
      .order('name')
    if (error) throw error
    return data
  },

  saveEmployee: async emp => {
    const { data, error } = await supabase.from('employees').insert({
      id: emp.id,
      emp_id: emp.empId || null,
      name: emp.name,
      salary: emp.salary,
      salary_type: emp.salaryType || 'weekly',
      identity_no: emp.identityNo || null,
      joining_date: emp.joiningDate || null,
      relieving_date: emp.relievingDate || null,
      phone: emp.phone || null,
      address: emp.address || null
    })
    if (error) throw error
    return data
  },

  updateEmployee: async emp => {
    const { data, error } = await supabase.from('employees').update({
      name: emp.name,
      salary: emp.salary,
      salary_type: emp.salaryType || 'weekly',
      emp_id: emp.empId || null,
      identity_no: emp.identityNo || null,
      joining_date: emp.joiningDate || null,
      relieving_date: emp.relievingDate || null,
      phone: emp.phone || null,
      address: emp.address || null
    }).eq('id', emp.id)
    if (error) throw error
    return data
  },

  getNextEmpId: async (prefix = 'THULIR') => {
    const { data } = await supabase.from('employees').select('emp_id').order('emp_id', { ascending: false }).limit(1)
    const lastId = data?.[0]?.emp_id
    if (!lastId) return `${prefix}_01`
    const num = parseInt(lastId.split('_')[1]) || 0
    return `${prefix}_${String(num + 1).padStart(2, '0')}`
  },

  deleteEmployee: id => supabase.from('employees').delete().eq('id', id),

  // Weekly entries
  weekly: async () => {
    const { data, error } = await supabase.from('weekly_entries').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  saveWeekly: e => supabase.from('weekly_entries').insert({
    id: e.id, name: e.name, week_label: e.weekLabel, date: e.date || null,
    days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
    adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
    period_id: e.periodId || null
  }),

  updateWeekly: e => supabase.from('weekly_entries').update({
    name: e.name, week_label: e.weekLabel, date: e.date || null,
    days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
    adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
  }).eq('id', e.id),

  deleteWeekly: id => supabase.from('weekly_entries').delete().eq('id', id),

  // Monthly entries
  monthlyAll: async () => {
    const { data, error } = await supabase.from('monthly_entries').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  saveMonthly: e => supabase.from('monthly_entries').insert({
    id: e.id, name: e.name, month_label: e.monthLabel, date: e.date || null,
    days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
    adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
    period_id: e.periodId || null
  }),

  updateMonthly: e => supabase.from('monthly_entries').update({
    name: e.name, month_label: e.monthLabel, date: e.date || null,
    days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
    adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
  }).eq('id', e.id),

  deleteMonthly: id => supabase.from('monthly_entries').delete().eq('id', id),

  // Advances
  advances: async () => {
    const { data, error } = await supabase.from('advances').select('*').order('date', { ascending: false })
    if (error) throw error
    return data
  },

  saveAdvance: a => supabase.from('advances').insert({
    id: a.id, name: a.name, date: a.date || null, amount: a.amount, remarks: a.remarks || ''
  }),

  deleteAdvance: id => supabase.from('advances').delete().eq('id', id),

  // Shortages
  shortages: async () => {
    const { data, error } = await supabase.from('shortages').select('*').order('date', { ascending: false })
    if (error) throw error
    return data
  },

  saveShortage: s => supabase.from('shortages').insert({
    id: s.id, name: s.name, date: s.date || null, amount: s.amount, remarks: s.remarks || ''
  }),

  deleteShortage: id => supabase.from('shortages').delete().eq('id', id),

  // Bank
  bank: async () => {
    const { data, error } = await supabase.from('bank_accounts').select('*').order('name')
    if (error) throw error
    return data
  },

  upsertBank: b => supabase.from('bank_accounts').upsert(b),
  deleteBank: name => supabase.from('bank_accounts').delete().eq('name', name),

  // Settings
  getSetting: async key => {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is no rows returned
    return data?.value ?? null
  },

  setSetting: (key, value) => supabase.from('settings').upsert({ key, value: String(value) }),
  getWorkingDays: async () => {
    const v = await DB.getSetting('working_days')
    return v ? Number(v) : 26
  },
  setWorkingDays: n => DB.setSetting('working_days', n),

  // Periods
  periods: async () => {
    const { data, error } = await supabase.from('payroll_periods').select('*').order('date_from', { ascending: false })
    if (error) throw error
    return data
  },

  openPeriod: async () => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  savePeriod: p => supabase.from('payroll_periods').insert(p),
  closePeriod: (id, total) => supabase.from('payroll_periods').update({
    status: 'closed', closed_at: new Date().toISOString(), total_payroll: total
  }).eq('id', id),

  reopenPeriod: id => supabase.from('payroll_periods').update({ status: 'open', closed_at: null }).eq('id', id),

  monthlyPeriods: async () => {
    const { data, error } = await supabase.from('monthly_periods').select('*').order('date_from', { ascending: false })
    if (error) throw error
    return data
  },

  openMonthlyPeriod: async () => {
    const { data, error } = await supabase
      .from('monthly_periods')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  saveMonthlyPeriod: p => supabase.from('monthly_periods').insert(p),
  closeMonthlyPeriod: (id, total) => supabase.from('monthly_periods').update({
    status: 'closed', closed_at: new Date().toISOString(), total_payroll: total
  }).eq('id', id),

  reopenMonthlyPeriod: id => supabase.from('monthly_periods').update({ status: 'open', closed_at: null }).eq('id', id),

  // ── High-performance Lookup Helpers ───────────────────────────────
  createEmpMap: (emps) => {
    const map = {}; emps.forEach(e => map[e.name] = e); return map;
  },
  createAdvMap: (advances) => {
    const map = {}; advances.forEach(a => { if(!map[a.name]) map[a.name] = 0; map[a.name] += Number(a.amount || 0) }); return map;
  },
  createDedMap: (entries) => {
    const map = { adv: {}, shr: {} };
    entries.forEach(e => {
      if(!map.adv[e.name]) map.adv[e.name] = 0;
      if(!map.shr[e.name]) map.shr[e.name] = 0;
      map.adv[e.name] += Number(e.adv_deducted || 0);
      map.shr[e.name] += Number(e.shr_deducted || 0);
    });
    return map;
  },

  // ── Calculation Helpers ──────────────────────────────────────────
  perDay: (emp, wd) => (emp?.salary || 0) / (wd || 26),

  // Optimized versions should use Maps passed from components
  weekSalary: (entry, emp, wd) => {
    if (!emp) return 0
    const pd = emp.salary / (wd || 26)
    const days = Number(entry.days_worked || 0) - Number(entry.leaves || 0)
    return Math.max(0, Math.round(pd * days - Number(entry.adv_deducted || 0) - Number(entry.shr_deducted || 0)))
  },

  monthlySalary: (entry, emp, wd) => {
    if (!emp) return 0
    const pd = emp.salary / (wd || 26)
    const days = Number(entry.days_worked || 0) - Number(entry.leaves || 0)
    return Math.max(0, Math.round(pd * days - Number(entry.adv_deducted || 0) - Number(entry.shr_deducted || 0)))
  },

  // Legacy fallback (O(N^2), use sparingly)
  totalAdvGiven: (name, advances) => advances.filter(a => a.name === name).reduce((s, a) => s + Number(a.amount), 0),
  totalShrGiven: (name, shortages) => shortages.filter(a => a.name === name).reduce((s, a) => s + Number(a.amount), 0),
  totalAdvDeducted: (name, weekly) => weekly.filter(w => w.name === name).reduce((s, w) => s + Number(w.adv_deducted || 0), 0),
  totalShrDeducted: (name, weekly) => weekly.filter(w => w.name === name).reduce((s, w) => s + Number(w.shr_deducted || 0), 0),
  advPending: (name, adv, wkly) => DB.totalAdvGiven(name, adv) - DB.totalAdvDeducted(name, wkly),
  shrPending: (name, shr, wkly) => DB.totalShrGiven(name, shr) - DB.totalShrDeducted(name, wkly),
  advPendingMonthly: (name, adv, mly) => DB.totalAdvGiven(name, adv) - (mly.filter(m => m.name === name).reduce((s, m) => s + Number(m.adv_deducted || 0), 0)),
  shrPendingMonthly: (name, shr, mly) => DB.totalShrGiven(name, shr) - (mly.filter(m => m.name === name).reduce((s, m) => s + Number(m.shr_deducted || 0), 0)),

  // Seeding
  async seed() {
    const { data: existing } = await supabase.from('employees').select('id').limit(1)
    if (existing?.length) return
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
    const seedData = names.map(([name, salary]) => ({ id: uid(), name, salary, salary_type: 'weekly' }))
    await supabase.from('employees').insert(seedData)
  }
}

