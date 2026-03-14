// ── PayrollDB: all localStorage operations ──────────────────────
const DB = {
  KEYS: { employees:'prl_employees', advances:'prl_advances', shortages:'prl_shortages', weekly:'prl_weekly', bank:'prl_bank' },

  get(key)       { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } },
  set(key, data) { localStorage.setItem(key, JSON.stringify(data)) },

  employees()  { return this.get(this.KEYS.employees) },
  advances()   { return this.get(this.KEYS.advances) },
  shortages()  { return this.get(this.KEYS.shortages) },
  weekly()     { return this.get(this.KEYS.weekly) },
  bank()       { return this.get(this.KEYS.bank) },

  saveEmployees(d)  { this.set(this.KEYS.employees, d) },
  saveAdvances(d)   { this.set(this.KEYS.advances, d) },
  saveShortages(d)  { this.set(this.KEYS.shortages, d) },
  saveWeekly(d)     { this.set(this.KEYS.weekly, d) },
  saveBank(d)       { this.set(this.KEYS.bank, d) },

  // ── Computed helpers ──────────────────────────────
  perDay(emp)  { return emp.salary / (emp.workingDays || 26) },

  totalAdvanceGiven(name)     { return this.advances().filter(a=>a.name===name).reduce((s,a)=>s+Number(a.amount),0) },
  totalShortageGiven(name)    { return this.shortages().filter(a=>a.name===name).reduce((s,a)=>s+Number(a.amount),0) },
  totalAdvanceDeducted(name)  { return this.weekly().filter(w=>w.name===name).reduce((s,w)=>s+Number(w.advDeducted||0),0) },
  totalShortageDeducted(name) { return this.weekly().filter(w=>w.name===name).reduce((s,w)=>s+Number(w.shrDeducted||0),0) },
  advancePending(name)        { return this.totalAdvanceGiven(name) - this.totalAdvanceDeducted(name) },
  shortagePending(name)       { return this.totalShortageGiven(name) - this.totalShortageDeducted(name) },

  weekSalary(entry) {
    const emp = this.employees().find(e=>e.name===entry.name);
    if (!emp) return 0;
    const pd = this.perDay(emp);
    const days = Number(entry.daysWorked||0) - Number(entry.leaves||0);
    return Math.max(0, pd * days - Number(entry.advDeducted||0) - Number(entry.shrDeducted||0));
  },

  // Seed default employees if empty
  seed() {
    if (this.employees().length) return;
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
    ];
    this.saveEmployees(names.map(([name,salary],i)=>({id:i+1,name,salary,workingDays:26})));

    const bankData = [
      ["KRISHNAMOORTHI R","SBI","20371096416","SBIN0000837","Erode"],
      ["HARIKRISHNAN KUMAR","SBI","40564318172","SBIN0012777","Erode"],
      ["RAJU P","SBI","42596312666","SBIN0040377","Erode"],
      ["NAGARAJ SHANMUGAM","SBI","40444823680","SBIN0012777","Erode"],
      ["DHATCHINAMOORTHI N","SBI","40464520660","SBIN0014822","Erode"],
      ["MANIKANDAN GOVINTHARAJ","SBI","43737868845","SBIN0040377","Erode"],
      ["RAVIKUMAR MURUGESAN","SBI","43575249157","SBIN0014822","Erode"],
      ["MOHANDHAS ARUNACHALAM","SBI","41518893966","SBIN0014822","Erode"],
      ["MANJULA NAMASIVAYAM","SBI","43645653403","SBIN0000837","Erode"],
    ].map(([name,bank,acc,ifsc,branch])=>({name,bank,acc,ifsc,branch}));
    this.saveBank(bankData);
  }
};
