# 💼 PayrollPro — Salary Management System

A complete payroll management web app built for small businesses.
Runs entirely in the browser — no server, no database needed.

## Features
- 📊 Dashboard with KPI cards and charts
- 👥 Employee Master — manage salaries
- 📅 Weekly Entry — attendance and salary calculation
- 💰 Advance Log — track multiple advances with dates
- ⚠️ Shortage Log — track shortage deductions
- 📋 Deduction Master — auto summary of all pending amounts
- 🏦 Bank Master — employee bank account details
- 🧾 Payslip Generator — generate and print payslips

## How to Deploy on GitHub Pages (Step by Step)

### Step 1 — Create a GitHub account
Go to https://github.com and sign up (free).

### Step 2 — Create a new repository
1. Click the **+** button → **New repository**
2. Name it: `payroll-system` (or any name you like)
3. Make it **Public**
4. Click **Create repository**

### Step 3 — Upload the files
1. In your new repo, click **Add file → Upload files**
2. Upload ALL files from this folder:
   - `index.html`
   - `css/style.css`
   - `js/store.js`
   - `js/app.js`
3. Keep the folder structure exactly as is
4. Click **Commit changes**

### Step 4 — Enable GitHub Pages
1. Go to your repo **Settings** tab
2. Scroll down to **Pages** (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch → **/ (root)**
5. Click **Save**

### Step 5 — Your website is live!
After 1-2 minutes, your site will be available at:
```
https://YOUR-USERNAME.github.io/payroll-system/
```

## Important Notes
- ⚠️ Data is stored in **browser localStorage** — it stays on the device/browser you use
- ✅ Works best on a dedicated computer (office PC or laptop)
- ⚠️ Clearing browser cache/history will erase data — use the same browser always
- 📱 Works on mobile too but best on desktop

## File Structure
```
payroll-system/
├── index.html          ← Main app file
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── store.js        ← Data layer (localStorage)
│   └── app.js          ← All page logic
└── README.md           ← This file
```
