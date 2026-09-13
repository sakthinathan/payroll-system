import { createClient } from '@supabase/supabase-js'

// ── Supabase Setup ────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPA_URL || !SUPA_KEY) {
  console.error('Supabase credentials missing in .env')
}

export const supabase = createClient(SUPA_URL, SUPA_KEY)

// ── In-Memory Fast Query Cache (0ms Instant Page Loads) ───────────
const cache = new Map()
const CACHE_TTL = 10000 // 10 seconds SWR TTL

async function cachedQuery(key, fetcher) {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && (now - hit.timestamp < CACHE_TTL)) {
    return hit.data
  }
  const data = await fetcher()
  cache.set(key, { data, timestamp: now })
  return data
}

export const invalidateCache = (keyPattern) => {
  if (!keyPattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key)
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────
export const uid = () => crypto.randomUUID()
export const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ── DB API ────────────────────────────────────────────────────────
export const DB = {
  clearCache: () => cache.clear(),

  // Employees
  employees: () => cachedQuery('employees', async () => {
    const { data, error } = await supabase.from('employees').select('*').order('name')
    if (error) throw error
    return data
  }),
  
  weeklyEmps: () => cachedQuery('weeklyEmps', async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .or('salary_type.eq.weekly,salary_type.is.null')
      .order('name')
    if (error) throw error
    return data
  }),

  monthlyEmps: () => cachedQuery('monthlyEmps', async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('salary_type', 'monthly')
      .order('name')
    if (error) throw error
    return data
  }),

  saveEmployee: async emp => {
    cache.clear()
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
      address: emp.address || null,
      pin_code: emp.pinCode || '1234',
      profile_photo: emp.profilePhoto || null,
      face_descriptor: emp.faceDescriptor || null
    })
    if (error) throw error
    return data
  },

  updateEmployee: async emp => {
    cache.clear()
    const payload = {
      name: emp.name,
      salary: emp.salary,
      salary_type: emp.salaryType || emp.salary_type || 'weekly',
      emp_id: emp.empId || emp.emp_id || null,
      identity_no: emp.identityNo || emp.identity_no || null,
      joining_date: emp.joiningDate || emp.joining_date || null,
      relieving_date: emp.relievingDate || emp.relieving_date || null,
      phone: emp.phone || null,
      address: emp.address || null,
      pin_code: emp.pinCode || emp.pin_code || '1234',
      profile_photo: emp.profilePhoto || emp.profile_photo || null,
      face_descriptor: emp.faceDescriptor || emp.face_descriptor || null
    }

    const { data, error } = await supabase.from('employees').update(payload).eq('id', emp.id)
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('profile_photo') || error.message?.includes('face_descriptor')) {
        console.warn('Supabase employees schema missing photo columns, updating basic profile fields:', error.message)
        delete payload.profile_photo
        delete payload.face_descriptor
        const { data: retryData, error: retryError } = await supabase.from('employees').update(payload).eq('id', emp.id)
        if (retryError) console.error('Retry error updating employee:', retryError)
        return retryData
      }
      console.warn('Supabase employee update issue:', error)
    }
    return data
  },

  getNextEmpId: async (prefix = 'THULIR') => {
    const { data } = await supabase.from('employees').select('emp_id').order('emp_id', { ascending: false }).limit(1)
    const lastId = data?.[0]?.emp_id
    if (!lastId) return `${prefix}_01`
    const num = parseInt(lastId.split('_')[1]) || 0
    return `${prefix}_${String(num + 1).padStart(2, '0')}`
  },

  deleteEmployee: async id => {
    cache.clear()
    return supabase.from('employees').delete().eq('id', id)
  },

  // Weekly entries
  weekly: () => cachedQuery('weekly', async () => {
    const { data, error } = await supabase.from('weekly_entries').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }),

  saveWeekly: async e => {
    cache.clear()
    const payload = {
      id: e.id, name: e.name, week_label: e.weekLabel, date: e.date || null,
      days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
      adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
      period_id: e.periodId || null
    }
    if (e.additionalSalary) payload.additional_salary = e.additionalSalary
    if (e.additionalWorkType) payload.additional_work_type = e.additionalWorkType

    const { data, error } = await supabase.from('weekly_entries').insert(payload)
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('additional_') || error.message?.includes('column')) {
        delete payload.additional_salary
        delete payload.additional_work_type
        const { data: retryData, error: retryError } = await supabase.from('weekly_entries').insert(payload)
        if (retryError) throw retryError
        return retryData
      }
      throw error
    }
    return data
  },

  updateWeekly: async e => {
    cache.clear()
    const payload = {
      name: e.name, week_label: e.weekLabel, date: e.date || null,
      days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
      adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
    }
    if (e.additionalSalary !== undefined) payload.additional_salary = e.additionalSalary || 0
    if (e.additionalWorkType !== undefined) payload.additional_work_type = e.additionalWorkType || ''

    const { data, error } = await supabase.from('weekly_entries').update(payload).eq('id', e.id)
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('additional_') || error.message?.includes('column')) {
        delete payload.additional_salary
        delete payload.additional_work_type
        const { data: retryData, error: retryError } = await supabase.from('weekly_entries').update(payload).eq('id', e.id)
        if (retryError) throw retryError
        return retryData
      }
      throw error
    }
    return data
  },

  deleteWeekly: async id => {
    cache.clear()
    return supabase.from('weekly_entries').delete().eq('id', id)
  },

  // Monthly entries
  monthlyAll: () => cachedQuery('monthlyAll', async () => {
    const { data, error } = await supabase.from('monthly_entries').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }),

  saveMonthly: async e => {
    cache.clear()
    const payload = {
      id: e.id, name: e.name, month_label: e.monthLabel, date: e.date || null,
      days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
      adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
      period_id: e.periodId || null
    }
    if (e.additionalSalary) payload.additional_salary = e.additionalSalary
    if (e.additionalWorkType) payload.additional_work_type = e.additionalWorkType

    const { data, error } = await supabase.from('monthly_entries').insert(payload)
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('additional_') || error.message?.includes('column')) {
        delete payload.additional_salary
        delete payload.additional_work_type
        const { data: retryData, error: retryError } = await supabase.from('monthly_entries').insert(payload)
        if (retryError) throw retryError
        return retryData
      }
      throw error
    }
    return data
  },

  updateMonthly: async e => {
    cache.clear()
    const payload = {
      name: e.name, month_label: e.monthLabel, date: e.date || null,
      days_worked: e.daysWorked || 0, leaves: e.leaves || 0,
      adv_deducted: e.advDeducted || 0, shr_deducted: e.shrDeducted || 0,
    }
    if (e.additionalSalary !== undefined) payload.additional_salary = e.additionalSalary || 0
    if (e.additionalWorkType !== undefined) payload.additional_work_type = e.additionalWorkType || ''

    const { data, error } = await supabase.from('monthly_entries').update(payload).eq('id', e.id)
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('additional_') || error.message?.includes('column')) {
        delete payload.additional_salary
        delete payload.additional_work_type
        const { data: retryData, error: retryError } = await supabase.from('monthly_entries').update(payload).eq('id', e.id)
        if (retryError) throw retryError
        return retryData
      }
      throw error
    }
    return data
  },

  deleteMonthly: async id => {
    cache.clear()
    return supabase.from('monthly_entries').delete().eq('id', id)
  },

  // Advances
  advances: () => cachedQuery('advances', async () => {
    const { data, error } = await supabase.from('advances').select('*').order('date', { ascending: false })
    if (error) throw error
    return data
  }),

  saveAdvance: async a => {
    cache.clear()
    return supabase.from('advances').insert({
      id: a.id, name: a.name, date: a.date || null, amount: a.amount, remarks: a.remarks || ''
    })
  },

  deleteAdvance: async id => {
    cache.clear()
    return supabase.from('advances').delete().eq('id', id)
  },

  // Shortages
  shortages: () => cachedQuery('shortages', async () => {
    const { data, error } = await supabase.from('shortages').select('*').order('date', { ascending: false })
    if (error) throw error
    return data
  }),

  saveShortage: async s => {
    cache.clear()
    return supabase.from('shortages').insert({
      id: s.id, name: s.name, date: s.date || null, amount: s.amount, remarks: s.remarks || ''
    })
  },

  deleteShortage: async id => {
    cache.clear()
    return supabase.from('shortages').delete().eq('id', id)
  },

  // Bank
  bank: () => cachedQuery('bank', async () => {
    const { data, error } = await supabase.from('bank_accounts').select('*').order('name')
    if (error) throw error
    return data
  }),

  upsertBank: async b => {
    cache.clear()
    return supabase.from('bank_accounts').upsert(b)
  },

  deleteBank: async name => {
    cache.clear()
    return supabase.from('bank_accounts').delete().eq('name', name)
  },

  // Settings
  getSetting: async key => {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).single()
    if (error && error.code !== 'PGRST116') throw error
    return data?.value ?? null
  },

  setSetting: async (key, value) => {
    cache.clear()
    return supabase.from('settings').upsert({ key, value: String(value) })
  },

  getWorkingDays: () => cachedQuery('working_days', async () => {
    const v = await DB.getSetting('working_days')
    return v ? Number(v) : 26
  }),

  setWorkingDays: async n => {
    cache.clear()
    return DB.setSetting('working_days', n)
  },

  // Periods
  periods: () => cachedQuery('periods', async () => {
    const { data, error } = await supabase.from('payroll_periods').select('*').order('date_from', { ascending: false })
    if (error) throw error
    return data
  }),

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

  savePeriod: async p => {
    cache.clear()
    return supabase.from('payroll_periods').insert(p)
  },

  closePeriod: async (id, total) => {
    cache.clear()
    return supabase.from('payroll_periods').update({
      status: 'closed', closed_at: new Date().toISOString(), total_payroll: total
    }).eq('id', id)
  },

  reopenPeriod: async id => {
    cache.clear()
    return supabase.from('payroll_periods').update({ status: 'open', closed_at: null }).eq('id', id)
  },

  monthlyPeriods: () => cachedQuery('monthlyPeriods', async () => {
    const { data, error } = await supabase.from('monthly_periods').select('*').order('date_from', { ascending: false })
    if (error) throw error
    return data
  }),

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

  saveMonthlyPeriod: async p => {
    cache.clear()
    return supabase.from('monthly_periods').insert(p)
  },

  closeMonthlyPeriod: async (id, total) => {
    cache.clear()
    return supabase.from('monthly_periods').update({
      status: 'closed', closed_at: new Date().toISOString(), total_payroll: total
    }).eq('id', id)
  },

  reopenMonthlyPeriod: async id => {
    cache.clear()
    return supabase.from('monthly_periods').update({ status: 'open', closed_at: null }).eq('id', id)
  },

  // ── Attendance Logs API ───────────────────────────────────────────
  attendanceLogs: () => cachedQuery('attendanceLogs', async () => {
    try {
      const { data, error } = await supabase.from('attendance_logs').select('*').order('created_at', { ascending: false })
      if (!error && data) return data
    } catch (e) {
      console.warn('Supabase attendance_logs fallback to localStorage')
    }
    const local = localStorage.getItem('thulir_attendance_logs')
    return local ? JSON.parse(local) : []
  }),

  saveAttendanceLog: async log => {
    cache.clear()
    try {
      const { data, error } = await supabase.from('attendance_logs').upsert(log)
      if (!error) return data
    } catch (e) {
      console.warn('Supabase attendance upsert fallback to localStorage')
    }
    const local = JSON.parse(localStorage.getItem('thulir_attendance_logs') || '[]')
    const idx = local.findIndex(l => l.id === log.id || (l.emp_id === log.emp_id && l.date === log.date))
    if (idx >= 0) local[idx] = { ...local[idx], ...log }
    else local.unshift(log)
    localStorage.setItem('thulir_attendance_logs', JSON.stringify(local))
    return log
  },

  approveAttendanceLogs: async (ids) => {
    cache.clear()
    try {
      const { data, error } = await supabase.from('attendance_logs').update({ status: 'approved' }).in('id', ids)
      if (!error) return data
    } catch (e) {}
    const local = JSON.parse(localStorage.getItem('thulir_attendance_logs') || '[]')
    local.forEach(l => { if (ids.includes(l.id)) l.status = 'approved' })
    localStorage.setItem('thulir_attendance_logs', JSON.stringify(local))
  },

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

  weekSalary: (entry, emp, wd) => {
    if (!emp) return 0
    const pd = emp.salary / (wd || 26)
    const days = Number(entry.days_worked || 0) - Number(entry.leaves || 0)
    const addSal = Number(entry.additional_salary || entry.additionalSalary || 0)
    const advD = Number(entry.adv_deducted || entry.advDeducted || 0)
    const shrD = Number(entry.shr_deducted || entry.shrDeducted || 0)
    return Math.max(0, Math.round(pd * days + addSal - advD - shrD))
  },

  monthlySalary: (entry, emp, wd) => {
    if (!emp) return 0
    const pd = emp.salary / (wd || 26)
    const days = Number(entry.days_worked || 0) - Number(entry.leaves || 0)
    const addSal = Number(entry.additional_salary || entry.additionalSalary || 0)
    const advD = Number(entry.adv_deducted || entry.advDeducted || 0)
    const shrD = Number(entry.shr_deducted || entry.shrDeducted || 0)
    return Math.max(0, Math.round(pd * days + addSal - advD - shrD))
  },

  totalAdvGiven: (name, advances) => advances.filter(a => a.name === name).reduce((s, a) => s + Number(a.amount), 0),
  totalShrGiven: (name, shortages) => shortages.filter(a => a.name === name).reduce((s, a) => s + Number(a.amount), 0),
  totalAdvDeducted: (name, weekly, monthly = []) => {
    const w = weekly ? weekly.filter(x => x.name === name).reduce((s, x) => s + Number(x.adv_deducted || 0), 0) : 0;
    const m = monthly ? monthly.filter(x => x.name === name).reduce((s, x) => s + Number(x.adv_deducted || 0), 0) : 0;
    return w + m;
  },
  totalShrDeducted: (name, weekly, monthly = []) => {
    const w = weekly ? weekly.filter(x => x.name === name).reduce((s, x) => s + Number(x.shr_deducted || 0), 0) : 0;
    const m = monthly ? monthly.filter(x => x.name === name).reduce((s, x) => s + Number(x.shr_deducted || 0), 0) : 0;
    return w + m;
  },
  advPending: (name, adv, wkly, mly = []) => DB.totalAdvGiven(name, adv) - DB.totalAdvDeducted(name, wkly, mly),
  shrPending: (name, shr, wkly, mly = []) => DB.totalShrGiven(name, shr) - DB.totalShrDeducted(name, wkly, mly),

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

