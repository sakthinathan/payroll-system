# 🧊 Midnight Frost — Feature Walkthrough

This document provides a detailed walkthrough of all the features and modules available in the **Midnight Frost Payroll Management System**.

---

## 1. 🔐 Secure Authentication
The system starts with a premium, high-security login interface.
- **Branded Portal**: Custom agency logo and address are displayed on the login card.
- **Session Management**: Powered by Supabase Auth, ensuring your session is persistent and secure.
- **Password Management**: Users can update their credentials at any time via the "Change Password" section in the sidebar.

## 2. 📊 The Dashboard
The command center for your payroll operations.
- **Real-Time KPIs**: Track total active employees, weekly payroll value, outstanding advances, and stock shortages at a glance.
- **Activity Feed**: View the most recent 8 weekly entries to monitor daily progress.
- **System Health**: Monitor the status of your Supabase Cloud connection and database health.

## 3. 👥 Employee Directory
Manage your entire workforce with ease.
- **Staff List**: A searchable table of all employees with their contracted salaries.
- **Salary Classification**: Categorize staff into **Weekly** or **Monthly** payout streams. This controls which payroll cycles they appear in.
- **Working Days Logic**: Configure the global "Working Days" (e.g., 26 days) which is used to calculate the per-day rate for all staff.

## 4. 📅 Weekly Payroll Entry
Designed for fast-paced weekly data logging.
- **Cycle Initialization**: Start a new week (e.g., May Week 1). The system auto-calculates the date range.
- **Batch Entry**: Enter days worked and leaves for all weekly staff in a single high-performance view.
- **Instant Deductions**: Deduct advances and shortages directly during the entry process.
- **Finalization**: "Close" the week to lock the data. Once closed, the totals are added to the staff ledgers.

## 5. 🗓️ Monthly Payroll Entry
Streamlined for monthly salaried staff.
- **Full-Month Processing**: Similar to the weekly view but optimized for the standard monthly cycle.
- **O(1) Calculations**: Even with large teams, the system calculates net salaries instantly using map-based lookups.

## 6. 💰 Advances & Shortages
Tracking staff debts and mismatch recoveries.
- **Advance Log**: Log cash advances given to staff with dates and remarks.
- **Shortage Log**: Record stock shortages or financial mismatches attributed to specific staff.
- **Auto-Sync**: These logs are automatically synced with the payroll entry pages for easy recovery.

## 7. 🧾 Financial Ledger (Personal)
A 360-degree financial view for every staff member.
- **Transaction History**: Every salary paid, advance given, and shortage deducted is recorded in a chronological ledger.
- **Visual Stats**: Quick-view cards show "Total Salary Received" vs "Total Recoveries Made".
- **Transparent Tracking**: Helps in resolving salary disputes with staff by showing their full financial history.

## 8. 🏦 Bank & Sharing
Streamline the payout process.
- **Bank Master**: Maintain a list of staff bank account details.
- **WhatsApp Integration**: 
    - Send **Bank List Reports** to management via WhatsApp.
    - Share individual **Payslips** directly with staff members in one click.

## 9. ⚙️ White-Label System (Technical)
The entire app can be rebranded in seconds.
- **Branding Config**: Located in `src/config/branding.js`.
- **Dynamic Assets**: Changing the name in the config updates the Sidebar, Login Page, Footer, and Page Titles instantly.
- **Responsive Layout**: The UI automatically adapts from a desktop sidebar to a mobile drawer on smaller screens.

---
*Enterprise Payroll System v2.0 — Engineered for Thulir Agency*
