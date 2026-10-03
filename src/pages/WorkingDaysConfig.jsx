import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Panel, Spinner } from '../components/UI'
import PayrollConfiguration from '../components/PayrollConfiguration'
import { DB } from '../lib/db'
import { ShieldAlert, BookOpen, Layers, CheckCircle, Calculator } from 'lucide-react'

export default function WorkingDaysConfig() {
  const [wd, setWd] = useState(26)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const days = await DB.getWorkingDays()
      setWd(days || 26)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <Layout title="Working Days Configuration">
        <Spinner />
      </Layout>
    )
  }

  return (
    <Layout title="Working Days Configuration">
      {/* Main Configuration Engine */}
      <PayrollConfiguration 
        currentWd={wd} 
        onUpdate={newWd => setWd(newWd)} 
      />

      {/* Explanatory Guide & Documentation Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brit-red)', marginBottom: 14 }}>
            <Calculator size={20} />
            <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              How Working Days Rate Calculation Works
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, marginBottom: 14 }}>
            The global <strong>Working Days</strong> setting is the primary denominator in Thulir Payroll's rate calculation engine. When staff salaries are computed, the daily rate is derived as:
          </p>
          <div style={{ background: 'var(--brit-cream-light)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>
            Daily Rate = Contracted Monthly Salary ÷ Base Working Days
          </div>
          <ul style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, paddingLeft: 18 }}>
            <li><strong>Weekly Payroll</strong>: Multiplies daily rate by actual days worked minus leaves.</li>
            <li><strong>Monthly Payroll</strong>: Pro-rates monthly pay based on days worked vs. base working days.</li>
            <li><strong>Sundays Off</strong>: By ignoring Sundays in the month calculation, rates accurately reflect typical FMCG operational cycles.</li>
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brit-green)', marginBottom: 14 }}>
            <Layers size={20} />
            <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--navy)' }}>
              Forward Period Application
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, marginBottom: 14 }}>
            When you select <em>"Apply from this month to future months"</em>, your configured working days setting is saved into system settings and automatically applied to:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={16} color="var(--brit-green)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>Active Weekly Payroll cycles currently open</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={16} color="var(--brit-green)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>Active & Future Monthly Payroll cycles</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={16} color="var(--brit-green)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>Payslip generation and bank disbursement exports</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={16} color="var(--brit-green)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>Staff ledger & advance recovery calculations</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
