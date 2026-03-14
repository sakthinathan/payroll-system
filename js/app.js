// ── Utilities ────────────────────────────────────────────────────
const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';
const uid = () => Date.now() + Math.random().toString(36).slice(2,7);

function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function modal(title, bodyHTML, onSave) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal">
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" id="modalClose">✕</button>
    </div>
    <div id="modalBody">${bodyHTML}</div>
    <div class="flex-gap mt-16" style="justify-content:flex-end">
      <button class="btn btn-ghost" id="modalCancel">Cancel</button>
      <button class="btn btn-primary" id="modalSave">💾 Save</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#modalClose').onclick =
  ov.querySelector('#modalCancel').onclick = () => ov.remove();
  ov.querySelector('#modalSave').onclick = () => { if(onSave(ov)) ov.remove(); };
  ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
}

function confirm_(msg, cb) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal" style="max-width:360px">
    <p style="font-size:14px;margin-bottom:20px">${msg}</p>
    <div class="flex-gap" style="justify-content:flex-end">
      <button class="btn btn-ghost btn-sm" id="cNo">Cancel</button>
      <button class="btn btn-danger btn-sm" id="cYes">Delete</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#cNo').onclick = () => ov.remove();
  ov.querySelector('#cYes').onclick = () => { ov.remove(); cb(); };
}

// ── ROUTER ───────────────────────────────────────────────────────
const routes = {};
function route(name, fn) { routes[name] = fn; }

function navigate(page) {
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.page===page));
  const titles = {
    dashboard:'📊 Dashboard', employees:'👥 Employee Master',
    weekly:'📅 Weekly Entry', advances:'💰 Advance Log',
    shortages:'⚠️ Shortage Log', deductions:'📋 Deduction Master',
    bank:'🏦 Bank Master', payslip:'🧾 Payslip Generator'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('content').innerHTML = '';
  if (routes[page]) routes[page]();
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════
route('dashboard', () => {
  const emps = DB.employees();
  const weekly = DB.weekly();
  const totalPayroll = emps.reduce((s,e)=>s+e.salary,0);
  const totalNet = weekly.reduce((s,w)=>s+DB.weekSalary(w),0);
  const totalAdv = emps.reduce((s,e)=>s+DB.totalAdvanceGiven(e.name),0);
  const totalShr = emps.reduce((s,e)=>s+DB.totalShortageGiven(e.name),0);
  const pendAdv = emps.reduce((s,e)=>s+DB.advancePending(e.name),0);
  const pendShr = emps.reduce((s,e)=>s+DB.shortagePending(e.name),0);

  const recentWeekly = [...weekly].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);

  const deptPay = {};
  weekly.forEach(w => {
    const emp = emps.find(e=>e.name===w.name);
    if(!emp) return;
    if(!deptPay[w.name]) deptPay[w.name]=0;
    deptPay[w.name]+=DB.weekSalary(w);
  });
  const top5 = Object.entries(deptPay).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxPay = top5[0]?.[1]||1;

  document.getElementById('content').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">💼</div>
        <div class="kpi-label">Total Payroll</div>
        <div class="kpi-value">${fmt(totalPayroll)}</div>
        <div class="kpi-sub">Monthly gross for ${emps.length} employees</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-icon">✅</div>
        <div class="kpi-label">Total Net Paid</div>
        <div class="kpi-value">${fmt(totalNet)}</div>
        <div class="kpi-sub">All weekly entries combined</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-icon">💸</div>
        <div class="kpi-label">Advance Pending</div>
        <div class="kpi-value">${fmt(pendAdv)}</div>
        <div class="kpi-sub">Still to recover</div>
      </div>
      <div class="kpi-card orange">
        <div class="kpi-icon">⚠️</div>
        <div class="kpi-label">Shortage Pending</div>
        <div class="kpi-value">${fmt(pendShr)}</div>
        <div class="kpi-sub">Still to recover</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="panel">
        <div class="panel-header"><h3>Top Earners (Weekly)</h3></div>
        <div class="panel-body">
          ${top5.length ? top5.map(([name,amt])=>`
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span style="font-weight:600">${name}</span>
                <span class="amt amt-green">${fmt(amt)}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${(amt/maxPay*100).toFixed(1)}%;background:var(--blue)"></div>
              </div>
            </div>`).join('') : '<div class="empty-state"><p>No weekly entries yet</p></div>'}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Recent Weekly Entries</h3></div>
        <div class="panel-body" style="padding:0">
          ${recentWeekly.length ? `<table><thead><tr><th>Employee</th><th>Week</th><th>Salary</th></tr></thead><tbody>
          ${recentWeekly.map(w=>`<tr>
            <td><strong style="font-size:12px">${w.name}</strong></td>
            <td><span class="badge badge-blue">${w.weekLabel||'—'}</span></td>
            <td class="amt amt-green">${fmt(DB.weekSalary(w))}</td>
          </tr>`).join('')}</tbody></table>` : '<div class="empty-state" style="padding:32px"><p>No entries yet</p></div>'}
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <div class="panel-header"><h3>Advance & Shortage Overview</h3></div>
      <div class="panel-body" style="padding:0">
        <table><thead><tr><th>Employee</th><th>Adv Given</th><th>Adv Deducted</th><th>Adv Pending</th><th>Shr Given</th><th>Shr Deducted</th><th>Shr Pending</th></tr></thead><tbody>
        ${emps.filter(e=>DB.totalAdvanceGiven(e.name)||DB.totalShortageGiven(e.name)).map(e=>`<tr>
          <td><strong>${e.name}</strong></td>
          <td class="amt">${fmt(DB.totalAdvanceGiven(e.name))}</td>
          <td class="amt">${fmt(DB.totalAdvanceDeducted(e.name))}</td>
          <td class="amt ${DB.advancePending(e.name)>0?'amt-red':'amt-green'}">${fmt(DB.advancePending(e.name))}</td>
          <td class="amt">${fmt(DB.totalShortageGiven(e.name))}</td>
          <td class="amt">${fmt(DB.totalShortageDeducted(e.name))}</td>
          <td class="amt ${DB.shortagePending(e.name)>0?'amt-red':'amt-green'}">${fmt(DB.shortagePending(e.name))}</td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--mid)">No advances or shortages recorded</td></tr>'}
        </tbody></table>
      </div>
    </div>`;
});

// ════════════════════════════════════════════════════════════════
// EMPLOYEES
// ════════════════════════════════════════════════════════════════
route('employees', () => {
  function render() {
    const emps = DB.employees();
    const q = document.getElementById('empSearch')?.value?.toLowerCase()||'';
    const filtered = emps.filter(e=>e.name.toLowerCase().includes(q));
    document.getElementById('empTableBody').innerHTML = filtered.map(e=>`
      <tr>
        <td><strong style="font-size:12px;color:var(--navy)">${e.name}</strong></td>
        <td class="amt amt-blue">${fmt(e.salary)}</td>
        <td style="text-align:center">${e.workingDays||26}</td>
        <td class="amt">${fmt((e.salary/(e.workingDays||26)).toFixed(2))}</td>
        <td>
          <div class="flex-gap">
            <button class="btn btn-ghost btn-sm" onclick="editEmp('${e.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEmp('${e.id}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--mid)">No employees found</td></tr>`;

    const total = emps.reduce((s,e)=>s+e.salary,0);
    document.getElementById('empTotal').textContent = fmt(total);
  }

  document.getElementById('content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input id="empSearch" placeholder="Search employees..." oninput="empSearchFn()"></div>
      <div class="flex-gap">
        <span id="empTotal" style="font-weight:700;color:var(--navy);font-family:var(--mono)"></span>
        <button class="btn btn-primary" onclick="addEmp()">+ Add Employee</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>All Employees</h3><span style="font-size:12px;opacity:.7">${DB.employees().length} employees</span></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Name</th><th>Monthly Salary</th><th>Working Days</th><th>Per Day Salary</th><th>Actions</th></tr></thead>
          <tbody id="empTableBody"></tbody>
        </table>
      </div>
    </div>`;
  render();

  window.empSearchFn = render;

  window.addEmp = () => modal('Add New Employee', `
    <div class="form-grid cols2">
      <div class="form-group"><label>Employee Name</label><input id="eName" placeholder="Full name in CAPS"></div>
      <div class="form-group"><label>Monthly Salary (₹)</label><input id="eSal" type="number" placeholder="e.g. 18000"></div>
      <div class="form-group"><label>Working Days/Month</label><input id="eWd" type="number" value="26" min="1" max="31"></div>
    </div>`, ov => {
    const name = ov.querySelector('#eName').value.trim().toUpperCase();
    const salary = Number(ov.querySelector('#eSal').value);
    const wd = Number(ov.querySelector('#eWd').value)||26;
    if (!name||!salary) { toast('Name and salary required','error'); return false; }
    const emps = DB.employees();
    emps.push({id:uid(), name, salary, workingDays:wd});
    DB.saveEmployees(emps); toast('Employee added ✅'); render(); return true;
  });

  window.editEmp = id => {
    const e = DB.employees().find(x=>x.id==id);
    if(!e) return;
    modal('Edit Employee', `
      <div class="form-grid cols2">
        <div class="form-group"><label>Name</label><input id="eName" value="${e.name}"></div>
        <div class="form-group"><label>Monthly Salary (₹)</label><input id="eSal" type="number" value="${e.salary}"></div>
        <div class="form-group"><label>Working Days</label><input id="eWd" type="number" value="${e.workingDays||26}"></div>
      </div>`, ov => {
      const emps = DB.employees();
      const idx = emps.findIndex(x=>x.id==id);
      emps[idx] = {...emps[idx], name:ov.querySelector('#eName').value.trim().toUpperCase(),
        salary:Number(ov.querySelector('#eSal').value), workingDays:Number(ov.querySelector('#eWd').value)||26};
      DB.saveEmployees(emps); toast('Saved ✅'); render(); return true;
    });
  };

  window.deleteEmp = id => confirm_('Delete this employee?', ()=>{
    DB.saveEmployees(DB.employees().filter(e=>e.id!=id));
    toast('Deleted','error'); render();
  });
});

// ════════════════════════════════════════════════════════════════
// WEEKLY ENTRY
// ════════════════════════════════════════════════════════════════
route('weekly', () => {
  function render() {
    const all = DB.weekly();
    const q = document.getElementById('wkSearch')?.value?.toLowerCase()||'';
    const wf = document.getElementById('wkFilter')?.value||'';
    let rows = all.filter(w=>(!q||w.name.toLowerCase().includes(q))&&(!wf||w.weekLabel===wf));
    rows = rows.sort((a,b)=>new Date(b.date)-new Date(a.date));
    document.getElementById('wkBody').innerHTML = rows.map(w=>`
      <tr>
        <td><span class="badge badge-blue">${w.weekLabel||'—'}</span></td>
        <td><strong style="font-size:12px">${w.name}</strong></td>
        <td style="text-align:center">${w.daysWorked||0}</td>
        <td style="text-align:center">${w.leaves||0}</td>
        <td class="amt amt-red">${fmt(w.advDeducted||0)}</td>
        <td class="amt amt-red">${fmt(w.shrDeducted||0)}</td>
        <td class="amt amt-blue">${fmt(DB.advancePending(w.name))}</td>
        <td class="amt amt-red">${fmt(DB.shortagePending(w.name))}</td>
        <td class="amt amt-green"><strong>${fmt(DB.weekSalary(w))}</strong></td>
        <td>
          <div class="flex-gap">
            <button class="btn btn-ghost btn-sm" onclick="editWeek('${w.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="delWeek('${w.id}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('')||`<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--mid)">No entries yet. Add weekly attendance to get started.</td></tr>`;
  }

  const weeks = [...new Set(DB.weekly().map(w=>w.weekLabel))].filter(Boolean);

  document.getElementById('content').innerHTML = `
    <div class="toolbar">
      <div class="flex-gap">
        <div class="search-box"><input id="wkSearch" placeholder="Search employee..." oninput="wkRender()"></div>
        <select id="wkFilter" onchange="wkRender()">
          <option value="">All Weeks</option>
          ${weeks.map(w=>`<option>${w}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" onclick="addWeek()">+ Add Entry</button>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Weekly Attendance & Salary</h3></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Week</th><th>Employee</th><th>Days</th><th>Leaves</th><th>Adv Deducted</th><th>Shr Deducted</th><th>Adv Pending</th><th>Shr Pending</th><th>Week Salary</th><th>Actions</th></tr></thead>
          <tbody id="wkBody"></tbody>
        </table>
      </div>
    </div>`;
  render();
  window.wkRender = render;

  function weekForm(entry={}) {
    const empOptions = DB.employees().map(e=>`<option value="${e.name}" ${entry.name===e.name?'selected':''}>${e.name}</option>`).join('');
    return `<div class="form-grid cols2">
      <div class="form-group"><label>Week Label</label>
        <select id="wkLabel"><option value="Week 1" ${entry.weekLabel==='Week 1'?'selected':''}>Week 1</option>
          <option value="Week 2" ${entry.weekLabel==='Week 2'?'selected':''}>Week 2</option>
          <option value="Week 3" ${entry.weekLabel==='Week 3'?'selected':''}>Week 3</option>
          <option value="Week 4" ${entry.weekLabel==='Week 4'?'selected':''}>Week 4</option>
          <option value="Week 5" ${entry.weekLabel==='Week 5'?'selected':''}>Week 5</option></select></div>
      <div class="form-group"><label>Date</label><input type="date" id="wkDate" value="${entry.date||new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>Employee</label><select id="wkEmp">${empOptions}</select></div>
      <div class="form-group"><label>Days Worked (0–7)</label><input type="number" id="wkDays" min="0" max="7" value="${entry.daysWorked??6}"></div>
      <div class="form-group"><label>Leaves (0–7)</label><input type="number" id="wkLeaves" min="0" max="7" value="${entry.leaves??0}"></div>
      <div class="form-group"><label>Advance Deducted (₹)</label><input type="number" id="wkAdv" min="0" value="${entry.advDeducted??0}"></div>
      <div class="form-group"><label>Shortage Deducted (₹)</label><input type="number" id="wkShr" min="0" value="${entry.shrDeducted??0}"></div>
    </div>`;
  }

  window.addWeek = () => modal('Add Weekly Entry', weekForm(), ov => {
    const entry = {
      id: uid(),
      weekLabel: ov.querySelector('#wkLabel').value,
      date: ov.querySelector('#wkDate').value,
      name: ov.querySelector('#wkEmp').value,
      daysWorked: Number(ov.querySelector('#wkDays').value),
      leaves: Number(ov.querySelector('#wkLeaves').value),
      advDeducted: Number(ov.querySelector('#wkAdv').value),
      shrDeducted: Number(ov.querySelector('#wkShr').value),
    };
    const all = DB.weekly(); all.push(entry); DB.saveWeekly(all);
    toast('Entry saved ✅'); render(); return true;
  });

  window.editWeek = id => {
    const entry = DB.weekly().find(w=>w.id==id);
    if(!entry) return;
    modal('Edit Weekly Entry', weekForm(entry), ov => {
      const all = DB.weekly();
      const idx = all.findIndex(w=>w.id==id);
      all[idx] = {...all[idx],
        weekLabel:ov.querySelector('#wkLabel').value, date:ov.querySelector('#wkDate').value,
        name:ov.querySelector('#wkEmp').value, daysWorked:Number(ov.querySelector('#wkDays').value),
        leaves:Number(ov.querySelector('#wkLeaves').value),
        advDeducted:Number(ov.querySelector('#wkAdv').value),
        shrDeducted:Number(ov.querySelector('#wkShr').value),
      };
      DB.saveWeekly(all); toast('Updated ✅'); render(); return true;
    });
  };

  window.delWeek = id => confirm_('Delete this entry?', ()=>{
    DB.saveWeekly(DB.weekly().filter(w=>w.id!=id)); toast('Deleted','error'); render();
  });
});

// ════════════════════════════════════════════════════════════════
// ADVANCE LOG
// ════════════════════════════════════════════════════════════════
route('advances', () => {
  function render() {
    const all = DB.advances().sort((a,b)=>new Date(b.date)-new Date(a.date));
    const q = document.getElementById('advSearch')?.value?.toLowerCase()||'';
    const rows = all.filter(a=>!q||a.name.toLowerCase().includes(q));
    document.getElementById('advBody').innerHTML = rows.map(a=>`
      <tr>
        <td>${fmtDate(a.date)}</td>
        <td><strong style="font-size:12px">${a.name}</strong></td>
        <td class="amt amt-blue">${fmt(a.amount)}</td>
        <td class="amt amt-red">${fmt(DB.totalAdvanceDeducted(a.name))}</td>
        <td class="amt ${DB.advancePending(a.name)>0?'amt-red':'amt-green'}">${fmt(DB.advancePending(a.name))}</td>
        <td style="font-size:12px;color:var(--mid)">${a.remarks||'—'}</td>
        <td>
          <div class="flex-gap">
            <button class="btn btn-danger btn-sm" onclick="delAdv('${a.id}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('')||`<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--mid)">No advances recorded yet</td></tr>`;

    const total = DB.advances().reduce((s,a)=>s+Number(a.amount),0);
    const totalPend = DB.employees().reduce((s,e)=>s+DB.advancePending(e.name),0);
    document.getElementById('advTotals').innerHTML = `
      <span style="font-size:13px;color:var(--mid)">Total Given: <strong class="amt-blue" style="font-family:var(--mono)">${fmt(total)}</strong></span>
      <span style="font-size:13px;color:var(--mid);margin-left:20px">Total Pending: <strong class="amt-red" style="font-family:var(--mono)">${fmt(totalPend)}</strong></span>`;
  }

  document.getElementById('content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input id="advSearch" placeholder="Search employee..." oninput="advRender()"></div>
      <div class="flex-gap">
        <span id="advTotals"></span>
        <button class="btn btn-primary" onclick="addAdv()">+ Add Advance</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Advance Transaction Log</h3></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Date</th><th>Employee</th><th>Amount Given</th><th>Total Deducted</th><th>Pending Balance</th><th>Remarks</th><th>Actions</th></tr></thead>
          <tbody id="advBody"></tbody>
        </table>
      </div>
    </div>`;
  render();
  window.advRender = render;

  window.addAdv = () => {
    const empOpts = DB.employees().map(e=>`<option>${e.name}</option>`).join('');
    modal('Record New Advance', `
      <div class="form-grid cols2">
        <div class="form-group"><label>Date Given</label><input type="date" id="aDate" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Employee</label><select id="aEmp">${empOpts}</select></div>
        <div class="form-group"><label>Advance Amount (₹)</label><input type="number" id="aAmt" min="0" placeholder="e.g. 2000"></div>
        <div class="form-group"><label>Remarks (optional)</label><input id="aRem" placeholder="e.g. Medical, Personal"></div>
      </div>`, ov => {
      const amt = Number(ov.querySelector('#aAmt').value);
      if (!amt) { toast('Enter a valid amount','error'); return false; }
      const all = DB.advances();
      all.push({id:uid(), date:ov.querySelector('#aDate').value, name:ov.querySelector('#aEmp').value,
        amount:amt, remarks:ov.querySelector('#aRem').value});
      DB.saveAdvances(all); toast('Advance recorded ✅'); render(); return true;
    });
  };

  window.delAdv = id => confirm_('Delete this advance record?', ()=>{
    DB.saveAdvances(DB.advances().filter(a=>a.id!=id)); toast('Deleted','error'); render();
  });
});

// ════════════════════════════════════════════════════════════════
// SHORTAGE LOG
// ════════════════════════════════════════════════════════════════
route('shortages', () => {
  function render() {
    const all = DB.shortages().sort((a,b)=>new Date(b.date)-new Date(a.date));
    const q = document.getElementById('shrSearch')?.value?.toLowerCase()||'';
    const rows = all.filter(a=>!q||a.name.toLowerCase().includes(q));
    document.getElementById('shrBody').innerHTML = rows.map(a=>`
      <tr>
        <td>${fmtDate(a.date)}</td>
        <td><strong style="font-size:12px">${a.name}</strong></td>
        <td class="amt amt-red">${fmt(a.amount)}</td>
        <td class="amt amt-red">${fmt(DB.totalShortageDeducted(a.name))}</td>
        <td class="amt ${DB.shortagePending(a.name)>0?'amt-red':'amt-green'}">${fmt(DB.shortagePending(a.name))}</td>
        <td style="font-size:12px;color:var(--mid)">${a.remarks||'—'}</td>
        <td><button class="btn btn-danger btn-sm" onclick="delShr('${a.id}')">🗑️</button></td>
      </tr>`).join('')||`<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--mid)">No shortages recorded yet</td></tr>`;

    const total = DB.shortages().reduce((s,a)=>s+Number(a.amount),0);
    const totalPend = DB.employees().reduce((s,e)=>s+DB.shortagePending(e.name),0);
    document.getElementById('shrTotals').innerHTML = `
      <span style="font-size:13px;color:var(--mid)">Total: <strong class="amt-red" style="font-family:var(--mono)">${fmt(total)}</strong></span>
      <span style="font-size:13px;color:var(--mid);margin-left:20px">Pending: <strong class="amt-red" style="font-family:var(--mono)">${fmt(totalPend)}</strong></span>`;
  }

  document.getElementById('content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input id="shrSearch" placeholder="Search employee..." oninput="shrRender()"></div>
      <div class="flex-gap">
        <span id="shrTotals"></span>
        <button class="btn btn-danger" onclick="addShr()">+ Add Shortage</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header" style="background:var(--red)"><h3>Shortage Transaction Log</h3></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Total Deducted</th><th>Pending Balance</th><th>Remarks</th><th>Actions</th></tr></thead>
          <tbody id="shrBody"></tbody>
        </table>
      </div>
    </div>`;
  render();
  window.shrRender = render;

  window.addShr = () => {
    const empOpts = DB.employees().map(e=>`<option>${e.name}</option>`).join('');
    modal('Record New Shortage', `
      <div class="form-grid cols2">
        <div class="form-group"><label>Date</label><input type="date" id="sDate" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Employee</label><select id="sEmp">${empOpts}</select></div>
        <div class="form-group"><label>Shortage Amount (₹)</label><input type="number" id="sAmt" min="0" placeholder="e.g. 500"></div>
        <div class="form-group"><label>Remarks</label><input id="sRem" placeholder="e.g. Material damage"></div>
      </div>`, ov => {
      const amt = Number(ov.querySelector('#sAmt').value);
      if (!amt) { toast('Enter a valid amount','error'); return false; }
      const all = DB.shortages();
      all.push({id:uid(), date:ov.querySelector('#sDate').value, name:ov.querySelector('#sEmp').value,
        amount:amt, remarks:ov.querySelector('#sRem').value});
      DB.saveShortages(all); toast('Shortage recorded ✅'); render(); return true;
    });
  };

  window.delShr = id => confirm_('Delete this shortage record?', ()=>{
    DB.saveShortages(DB.shortages().filter(a=>a.id!=id)); toast('Deleted','error'); render();
  });
});

// ════════════════════════════════════════════════════════════════
// DEDUCTION MASTER (auto summary)
// ════════════════════════════════════════════════════════════════
route('deductions', () => {
  const emps = DB.employees();
  document.getElementById('content').innerHTML = `
    <div style="background:var(--yellow);border-radius:10px;padding:12px 18px;margin-bottom:18px;font-size:13px">
      📌 This page is <strong>fully automatic</strong> — all values are calculated from Advance Log, Shortage Log, and Weekly Entry. Nothing to enter here.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="panel">
        <div class="panel-header"><h3>💰 Advance Summary</h3></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Total Given</th><th>Deducted</th><th>Pending</th></tr></thead>
            <tbody>
              ${emps.map(e=>{
                const given=DB.totalAdvanceGiven(e.name), ded=DB.totalAdvanceDeducted(e.name), pend=given-ded;
                return `<tr>
                  <td><strong style="font-size:12px">${e.name}</strong></td>
                  <td class="amt amt-blue">${fmt(given)}</td>
                  <td class="amt">${fmt(ded)}</td>
                  <td class="amt ${pend>0?'amt-red':'amt-green'}">${fmt(pend)}</td>
                </tr>`;
              }).join('')}
              <tr style="background:var(--navy);color:#fff;font-weight:700">
                <td>TOTAL</td>
                <td class="amt" style="color:#7dd3fc;font-family:var(--mono)">${fmt(emps.reduce((s,e)=>s+DB.totalAdvanceGiven(e.name),0))}</td>
                <td class="amt" style="color:#fff;font-family:var(--mono)">${fmt(emps.reduce((s,e)=>s+DB.totalAdvanceDeducted(e.name),0))}</td>
                <td class="amt" style="color:#86efac;font-family:var(--mono)">${fmt(emps.reduce((s,e)=>s+DB.advancePending(e.name),0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header" style="background:var(--red)"><h3>⚠️ Shortage Summary</h3></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Total</th><th>Deducted</th><th>Pending</th></tr></thead>
            <tbody>
              ${emps.map(e=>{
                const given=DB.totalShortageGiven(e.name), ded=DB.totalShortageDeducted(e.name), pend=given-ded;
                return `<tr>
                  <td><strong style="font-size:12px">${e.name}</strong></td>
                  <td class="amt amt-red">${fmt(given)}</td>
                  <td class="amt">${fmt(ded)}</td>
                  <td class="amt ${pend>0?'amt-red':'amt-green'}">${fmt(pend)}</td>
                </tr>`;
              }).join('')}
              <tr style="background:var(--red);color:#fff;font-weight:700">
                <td>TOTAL</td>
                <td class="amt" style="color:#fca5a5;font-family:var(--mono)">${fmt(emps.reduce((s,e)=>s+DB.totalShortageGiven(e.name),0))}</td>
                <td class="amt" style="color:#fff;font-family:var(--mono)">${fmt(emps.reduce((s,e)=>s+DB.totalShortageDeducted(e.name),0))}</td>
                <td class="amt" style="color:#bbf7d0;font-family:var(--mono)">${fmt(emps.reduce((s,e)=>s+DB.shortagePending(e.name),0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
});

// ════════════════════════════════════════════════════════════════
// BANK MASTER
// ════════════════════════════════════════════════════════════════
route('bank', () => {
  function render() {
    const all = DB.bank();
    const q = document.getElementById('bnkSearch')?.value?.toLowerCase()||'';
    const rows = all.filter(b=>!q||b.name.toLowerCase().includes(q));
    document.getElementById('bnkBody').innerHTML = rows.map(b=>`
      <tr>
        <td><strong style="font-size:12px">${b.name}</strong></td>
        <td><span class="badge badge-blue">${b.bank||'—'}</span></td>
        <td style="font-family:var(--mono);font-size:12px">${b.acc||'—'}</td>
        <td style="font-family:var(--mono);font-size:12px">${b.ifsc||'—'}</td>
        <td>${b.branch||'—'}</td>
        <td class="amt amt-green">${fmt(DB.employees().find(e=>e.name===b.name)?.salary||0)}</td>
        <td>
          <div class="flex-gap">
            <button class="btn btn-ghost btn-sm" onclick="editBank('${b.name}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="delBank('${b.name}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('')||`<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--mid)">No bank records yet</td></tr>`;
  }

  document.getElementById('content').innerHTML = `
    <div class="toolbar">
      <div class="search-box"><input id="bnkSearch" placeholder="Search employee..." oninput="bnkRender()"></div>
      <button class="btn btn-primary" onclick="addBank()">+ Add Bank Account</button>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Employee Bank Accounts</h3></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Bank</th><th>Account No.</th><th>IFSC</th><th>Branch</th><th>Monthly Salary</th><th>Actions</th></tr></thead>
          <tbody id="bnkBody"></tbody>
        </table>
      </div>
    </div>`;
  render();
  window.bnkRender = render;

  function bankForm(b={}) {
    const empOpts = DB.employees().map(e=>`<option value="${e.name}" ${b.name===e.name?'selected':''}>${e.name}</option>`).join('');
    return `<div class="form-grid cols2">
      <div class="form-group" style="grid-column:1/-1"><label>Employee</label><select id="bEmp">${empOpts}</select></div>
      <div class="form-group"><label>Bank Name</label><input id="bBank" value="${b.bank||'SBI'}" placeholder="e.g. SBI"></div>
      <div class="form-group"><label>Account Number</label><input id="bAcc" value="${b.acc||''}" placeholder="Account number"></div>
      <div class="form-group"><label>IFSC Code</label><input id="bIfsc" value="${b.ifsc||''}" placeholder="e.g. SBIN0000837"></div>
      <div class="form-group"><label>Branch</label><input id="bBranch" value="${b.branch||'Erode'}" placeholder="Branch name"></div>
    </div>`;
  }

  window.addBank = () => modal('Add Bank Account', bankForm(), ov => {
    const rec = {
      name:ov.querySelector('#bEmp').value, bank:ov.querySelector('#bBank').value,
      acc:ov.querySelector('#bAcc').value, ifsc:ov.querySelector('#bIfsc').value.toUpperCase(),
      branch:ov.querySelector('#bBranch').value
    };
    if(!rec.acc) { toast('Account number required','error'); return false; }
    const all = DB.bank().filter(b=>b.name!==rec.name); all.push(rec);
    DB.saveBank(all); toast('Bank account saved ✅'); render(); return true;
  });

  window.editBank = name => {
    const b = DB.bank().find(x=>x.name===name)||{name};
    modal('Edit Bank Account', bankForm(b), ov => {
      const rec = {
        name:ov.querySelector('#bEmp').value, bank:ov.querySelector('#bBank').value,
        acc:ov.querySelector('#bAcc').value, ifsc:ov.querySelector('#bIfsc').value.toUpperCase(),
        branch:ov.querySelector('#bBranch').value
      };
      const all = DB.bank().filter(b=>b.name!==rec.name); all.push(rec);
      DB.saveBank(all); toast('Updated ✅'); render(); return true;
    });
  };

  window.delBank = name => confirm_('Delete this bank record?', ()=>{
    DB.saveBank(DB.bank().filter(b=>b.name!==name)); toast('Deleted','error'); render();
  });
});

// ════════════════════════════════════════════════════════════════
// PAYSLIP GENERATOR
// ════════════════════════════════════════════════════════════════
route('payslip', () => {
  const emps = DB.employees();

  function renderPayslip(empName, weekLabel) {
    const emp = emps.find(e=>e.name===empName);
    if(!emp) return;
    const entries = DB.weekly().filter(w=>w.name===empName&&(!weekLabel||w.weekLabel===weekLabel));
    const pd = DB.perDay(emp);
    const totalDays = entries.reduce((s,w)=>s+Number(w.daysWorked||0)-Number(w.leaves||0),0);
    const totalAdv = entries.reduce((s,w)=>s+Number(w.advDeducted||0),0);
    const totalShr = entries.reduce((s,w)=>s+Number(w.shrDeducted||0),0);
    const earned = pd * totalDays;
    const netPay = earned - totalAdv - totalShr;
    const bankInfo = DB.bank().find(b=>b.name===empName)||{};

    document.getElementById('payslipOut').innerHTML = `
      <div class="payslip">
        <div class="payslip-header">
          <h2>YOUR COMPANY NAME</h2>
          <p>Address, Erode · hr@company.com</p>
          <div class="payslip-badge">SALARY SLIP — ${weekLabel||'All Weeks'}</div>
        </div>
        <div class="payslip-body">
          <div class="payslip-info">
            <div class="info-row"><div class="info-label">Employee Name</div><strong>${emp.name}</strong></div>
            <div class="info-row"><div class="info-label">Monthly Salary</div><strong>${fmt(emp.salary)}</strong></div>
            <div class="info-row"><div class="info-label">Per Day Rate</div><strong>${fmt(pd.toFixed(2))}</strong></div>
            <div class="info-row"><div class="info-label">Days Worked</div><strong>${totalDays} days</strong></div>
            <div class="info-row"><div class="info-label">Bank</div><strong>${bankInfo.bank||'—'} · ${bankInfo.acc||'—'}</strong></div>
            <div class="info-row"><div class="info-label">IFSC</div><strong>${bankInfo.ifsc||'—'}</strong></div>
          </div>
          <div class="payslip-tables">
            <div class="payslip-table earn">
              <h4>EARNINGS</h4>
              <table>
                <tr><td>Salary Earned</td><td>${fmt(earned)}</td></tr>
                <tr style="border-top:2px solid #e2e8f0"><td><strong>GROSS</strong></td><td><strong>${fmt(earned)}</strong></td></tr>
              </table>
            </div>
            <div class="payslip-table deduct">
              <h4>DEDUCTIONS</h4>
              <table>
                <tr><td>Advance Deducted</td><td>${fmt(totalAdv)}</td></tr>
                <tr><td>Shortage Deducted</td><td>${fmt(totalShr)}</td></tr>
                <tr style="border-top:2px solid #e2e8f0"><td><strong>TOTAL</strong></td><td><strong>${fmt(totalAdv+totalShr)}</strong></td></tr>
              </table>
            </div>
          </div>
          <div class="payslip-total">
            <div><div class="label">NET PAY (Take Home)</div><div style="font-size:11px;opacity:.7">After all deductions</div></div>
            <div class="amount">${fmt(netPay)}</div>
          </div>
          <div style="margin-top:16px;text-align:center;font-size:11px;color:var(--mid)">
            This is a computer-generated payslip and does not require a physical signature.
          </div>
        </div>
      </div>`;
  }

  const weeks = ['', ...new Set(DB.weekly().map(w=>w.weekLabel)).values()];
  const empOpts = emps.map(e=>`<option>${e.name}</option>`).join('');
  const wkOpts = weeks.map(w=>`<option value="${w}">${w||'All Weeks'}</option>`).join('');

  document.getElementById('content').innerHTML = `
    <div style="display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:start">
      <div class="panel" style="position:sticky;top:80px">
        <div class="panel-header"><h3>Select Employee</h3></div>
        <div class="panel-body">
          <div class="form-group" style="margin-bottom:14px">
            <label>Employee</label>
            <select id="psEmp" onchange="psGenerate()">${empOpts}</select>
          </div>
          <div class="form-group" style="margin-bottom:18px">
            <label>Week</label>
            <select id="psWeek" onchange="psGenerate()">${wkOpts}</select>
          </div>
          <button class="btn btn-primary" style="width:100%" onclick="window.print()">🖨️ Print Payslip</button>
        </div>
      </div>
      <div id="payslipOut">
        <div class="empty-state" style="background:#fff;border-radius:16px;padding:64px;box-shadow:var(--shadow)">
          <div class="icon">🧾</div>
          <p>Select an employee to generate their payslip</p>
        </div>
      </div>
    </div>`;

  window.psGenerate = () => renderPayslip(
    document.getElementById('psEmp').value,
    document.getElementById('psWeek').value
  );

  // Auto-generate for first employee
  if (emps.length) renderPayslip(emps[0].name, '');
});

// ════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  DB.seed();
  document.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.page); });
  });
  navigate('dashboard');
});
