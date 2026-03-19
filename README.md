# 💼 Thulir Agency — Payroll System (React)

A full-featured payroll management system built with React + Vite + Supabase.

## Tech Stack
- **React 18** with React Router v6
- **Vite** for fast builds
- **Supabase** cloud database
- **react-hot-toast** for notifications
- **lucide-react** for icons
- **GitHub Pages** for hosting

## Features
- 🔐 Login / Logout with session management
- 📊 Dashboard with KPI cards
- 👥 Employee Master with working days setting
- 📆 Payroll Periods — start, close, reopen
- 📅 Weekly Entry with bulk add
- 💰 Advance & Shortage tracking
- 📋 Deduction Master (auto summary)
- 🏦 Bank Master with WhatsApp integration
- 🧾 Payslip Generator with WhatsApp share
- 💾 Backup & Restore

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173/payroll-system/`

## Deploy to GitHub Pages

### Option 1 — Automatic (GitHub Actions)
1. Push code to your GitHub repo
2. Go to **Settings → Pages → Source: GitHub Actions**
3. Every push to `main` will auto-deploy!

### Option 2 — Manual Build
```bash
npm run build
# Upload the `dist` folder contents to your repo
```

## Configuration

Edit `vite.config.js` to match your repo name:
```js
base: '/your-repo-name/'
```

Edit `src/App.jsx` basename:
```jsx
<BrowserRouter basename="/your-repo-name">
```

## Default Login
- Username: `admin`
- Password: `thulir123`

Change after first login in **🔑 Change Password**
