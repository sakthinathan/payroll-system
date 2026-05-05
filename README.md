# ❄️ Midnight Frost — Enterprise Payroll System

A premium, white-label payroll management platform engineered for speed, security, and high-fidelity user experience. Built with **React 18**, **Vite**, **Supabase**, and **Framer Motion**.

![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)
![UI](https://img.shields.io/badge/UI-Midnight_Frost-6366f1?style=for-the-badge)
![Responsiveness](https://img.shields.io/badge/Mobile-Optimized-10b981?style=for-the-badge)

---

## ✨ Features

### 💎 Premium Design & UX
- **Midnight Frost UI**: High-fidelity glassmorphism aesthetic with fluid typography.
- **Mobile Responsive**: Fully adaptive layout with a native-style mobile drawer.
- **Micro-Animations**: Smooth state transitions powered by Framer Motion.
- **Fluid Scaling**: Robust `clamp()` based scaling for perfect zoom on all devices.

### 🏢 White-Label Ready
- **Centralized Branding**: Change company name, logo, address, and theme colors in one single config file (`branding.js`).
- **Generic Architecture**: Decoupled branding from core business logic for multi-tenant deployment.

### 📊 Payroll Core
- **Dual Stream Payroll**: Seamlessly manage both **Weekly** and **Monthly** employee types.
- **O(1) Performance**: High-performance map-based database lookups for instant calculations.
- **Financial Ledger**: Full financial history for every staff member including advances, shortages, and recoveries.
- **Bulk Operations**: Intelligent batch entry for weekly hours and leaves.

### 🔐 Security & Integration
- **Supabase Auth**: Secure authentication with Row Level Security (RLS).
- **WhatsApp Integration**: Share payslips and bank lists directly via WhatsApp.
- **Cloud Backup**: Export and restore system state with one click.

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/sakthinathan/payroll-system.git
cd payroll-system
npm install
```

### 2. Environment Setup
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Local Development
```bash
npm run dev
```

---

## 🎨 White-Labeling Guide

To rebrand this application for a new client, navigate to `src/config/branding.js` and update the configuration object:

```javascript
export const BRAND = {
  name: "YOUR CLIENT NAME",
  tagline: "Custom Payroll Suite",
  address: "City, Country",
  logoEmoji: "💼",
  // ...
};
```

---

## 📱 Mobile & Tablet
This application is fully responsive. For the best experience on mobile:
- **Navigation**: Access the hamburger menu in the top-left corner.
- **Tables**: Horizontal scroll is enabled for wide data views.
- **Inputs**: All fields are touch-optimized for fast entry.

---

## 🛠️ Tech Stack
- **Framework**: React 18 (Vite)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Vanilla CSS (Modern CSS Variables + Clamp)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Hosting**: GitHub Pages

---

## 📄 License
Custom Enterprise License — &copy; 2026 Thulir Agency
