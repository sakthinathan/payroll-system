import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, 
  Sparkles, RotateCcw, Calculator, AlertCircle, ArrowRight
} from 'lucide-react'
import { 
  calculateMonthWorkingDays, 
  getYearsRange, 
  MONTH_NAMES, 
  MONTH_SHORT_NAMES, 
  WEEKDAYS_MON_FIRST 
} from '../lib/payrollCalendar'
import { DB, fmt } from '../lib/db'

export default function PayrollConfiguration({ currentWd, onUpdate }) {
  const today = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()
  const currentMonthIndex = today.getMonth()

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex)
  const [workingDaysInput, setWorkingDaysInput] = useState(currentWd || 26)
  const [applyToFuture, setApplyToFuture] = useState(true)
  const [isManualOverride, setIsManualOverride] = useState(false)
  const [showCalendarGrid, setShowCalendarGrid] = useState(true)
  const [savedConfig, setSavedConfig] = useState(null)
  const [saving, setSaving] = useState(false)

  const years = useMemo(() => getYearsRange(currentYear, 2, 6), [currentYear])

  // Real-time calculation based on selected month and year
  const calculation = useMemo(() => {
    return calculateMonthWorkingDays(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth])

  // Load existing working days configuration from DB on mount
  useEffect(() => {
    let isMounted = true
    DB.getWorkingDaysConfig().then(cfg => {
      if (isMounted && cfg) {
        setSavedConfig(cfg)
        if (cfg.selectedYear) setSelectedYear(cfg.selectedYear)
        if (cfg.selectedMonth !== undefined) setSelectedMonth(cfg.selectedMonth)
        if (cfg.workingDays) setWorkingDaysInput(cfg.workingDays)
      }
    }).catch(() => {})
    return () => { isMounted = false }
  }, [])

  // When selected month/year changes, auto-update the input unless manual override was explicitly chosen
  useEffect(() => {
    if (!isManualOverride) {
      setWorkingDaysInput(calculation.workingDays)
    }
  }, [calculation.workingDays, isManualOverride])

  const handleMonthChange = (idx) => {
    setSelectedMonth(idx)
    setIsManualOverride(false)
  }

  const handleYearChange = (yr) => {
    setSelectedYear(Number(yr))
    setIsManualOverride(false)
  }

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
    setIsManualOverride(false)
  }

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
    setIsManualOverride(false)
  }

  const jumpToCurrentMonth = () => {
    setSelectedYear(currentYear)
    setSelectedMonth(currentMonthIndex)
    setIsManualOverride(false)
  }

  const resetToAutoCalculated = () => {
    setWorkingDaysInput(calculation.workingDays)
    setIsManualOverride(false)
    toast.success(`Reset to auto-calculated: ${calculation.workingDays} working days`)
  }

  const handleSaveAndApply = async () => {
    const finalDays = Number(workingDaysInput)
    if (isNaN(finalDays) || finalDays < 1 || finalDays > 31) {
      toast.error('Please enter a valid number of working days (1 - 31)')
      return
    }

    setSaving(true)
    const pad = n => String(n).padStart(2, '0')
    const configData = {
      workingDays: finalDays,
      selectedMonth,
      selectedYear,
      monthLabel: calculation.monthLabel,
      totalDays: calculation.totalDays,
      sundaysCount: calculation.sundaysCount,
      sundayDates: calculation.sundayDates,
      effectiveFrom: `${selectedYear}-${pad(selectedMonth + 1)}`,
      applyToFuture,
      isManualOverride,
      updatedAt: new Date().toISOString()
    }

    try {
      await DB.setWorkingDaysConfig(configData)
      setSavedConfig(configData)
      if (onUpdate) {
        onUpdate(finalDays)
      }
      toast.success(
        `Working days set to ${finalDays} (${calculation.monthLabel} applied to future periods) ✅`,
        { duration: 4000 }
      )
    } catch (err) {
      console.error('Error updating working days configuration:', err)
      toast.error('Failed to update working days configuration')
    } finally {
      setSaving(false)
    }
  }

  const sampleDailyRate1 = Math.round(27000 / (workingDaysInput || 26))
  const sampleDailyRate2 = Math.round(17500 / (workingDaysInput || 26))

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: 28 }}>
      {/* Header section with Current Period status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ 
              background: 'var(--brit-red)', 
              color: '#fff', 
              fontSize: 11, 
              fontWeight: 900, 
              padding: '3px 10px', 
              borderRadius: 9999, 
              letterSpacing: 1.2, 
              textTransform: 'uppercase' 
            }}>
              Payroll Engine Setting
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>
              Britannia FMCG Rate Standard
            </span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--brit-red)', letterSpacing: '-0.5px', textTransform: 'uppercase', marginTop: 6 }}>
            Payroll Configuration
          </h2>
          <p style={{ fontSize: 14, color: 'var(--slate)', fontWeight: 600, marginTop: 2 }}>
            Global working days setting for rate calculation • Auto-calculates by excluding Sundays
          </p>
        </div>

        {/* Current Active Status Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, var(--brit-cream-light) 0%, #FFFFFF 100%)', 
          border: '2px solid var(--border)', 
          borderRadius: 20, 
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 18,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            background: 'var(--brit-red-light)', 
            color: 'var(--brit-red)', 
            width: 54, 
            height: 54, 
            borderRadius: 16, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 4px 14px rgba(227,30,36,0.18)' 
          }}>
            <Calendar size={28} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Current Period Setting
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--navy)', letterSpacing: -1, lineHeight: 1.1 }}>
              {currentWd} Working Days
            </div>
            {savedConfig?.monthLabel && (
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brit-green)', marginTop: 4 }}>
                ✓ Effective from {savedConfig.monthLabel} onwards
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar Controls */}
      <div style={{ 
        background: '#FFFFFF', 
        border: '2px solid var(--border)', 
        borderRadius: 22, 
        padding: '24px', 
        marginBottom: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {/* Navigation bar: Year & Month Pickers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'var(--brit-red-light)', color: 'var(--brit-red)', padding: '6px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13 }}>
              <Calculator size={16} />
              <span>Select Month & Year</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 600 }}>
              Pick any month to auto-calculate base working days without Sundays:
            </span>
          </div>

          {/* Quick jump to today's month */}
          <button 
            type="button"
            className="btn btn-sm" 
            onClick={jumpToCurrentMonth}
            style={{ 
              background: (selectedMonth === currentMonthIndex && selectedYear === currentYear) ? 'var(--brit-cream)' : '#FFFFFF', 
              border: '1px solid var(--border)', 
              color: 'var(--navy)',
              fontWeight: 800,
              fontSize: 12
            }}
          >
            <Sparkles size={14} color="var(--brit-red)" />
            <span>Today ({MONTH_SHORT_NAMES[currentMonthIndex]} {currentYear})</span>
          </button>
        </div>

        {/* Year and Month Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) 1fr', gap: 20, alignItems: 'center', marginBottom: 24 }}>
          {/* Year selector with Steppers */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--brit-cream-light)', padding: '6px', borderRadius: 9999, border: '2px solid var(--border)' }}>
            <button 
              type="button" 
              onClick={prevMonth} 
              aria-label="Previous Month"
              style={{ width: 36, height: 36, borderRadius: 9999, border: 'none', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', boxShadow: '0 2px 5px rgba(0,0,0,0.06)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
              <select 
                value={selectedYear} 
                onChange={e => handleYearChange(e.target.value)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  fontSize: 16, 
                  fontWeight: 900, 
                  color: 'var(--navy)', 
                  cursor: 'pointer',
                  outline: 'none',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                {years.map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <button 
              type="button" 
              onClick={nextMonth} 
              aria-label="Next Month"
              style={{ width: 36, height: 36, borderRadius: 9999, border: 'none', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', boxShadow: '0 2px 5px rgba(0,0,0,0.06)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Month Pills for fast selection */}
          <div style={{ 
            display: 'flex', 
            gap: 6, 
            overflowX: 'auto', 
            padding: '4px 2px',
            scrollbarWidth: 'none'
          }}>
            {MONTH_NAMES.map((name, idx) => {
              const isSelected = selectedMonth === idx
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleMonthChange(idx)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 9999,
                    border: isSelected ? '2px solid var(--brit-red)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--brit-red)' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : 'var(--navy)',
                    fontSize: 13,
                    fontWeight: isSelected ? 900 : 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 4px 12px rgba(227,30,36,0.25)' : 'none',
                    transform: isSelected ? 'scale(1.04)' : 'none'
                  }}
                >
                  {MONTH_SHORT_NAMES[idx]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Calculation Summary KPI Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          {/* Card 1: Total Calendar Days */}
          <div style={{ 
            background: 'var(--brit-cream-light)', 
            border: '1.5px solid var(--border)', 
            borderRadius: 18, 
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFFFFF', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Total Days
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)' }}>
                {calculation.totalDays} Days
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600, marginTop: 2 }}>
                in {calculation.monthName} {calculation.year}
              </div>
            </div>
          </div>

          {/* Card 2: Sundays Ignored */}
          <div style={{ 
            background: '#FFF5F5', 
            border: '1.5px solid #FCD4D4', 
            borderRadius: 18, 
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FDE8E8', color: 'var(--brit-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FCD4D4' }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Sundays Ignored (Off)
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--brit-red)' }}>
                {calculation.sundaysCount} Sundays
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600, marginTop: 2 }}>
                Dates: {calculation.sundayDates.join(', ')}
              </div>
            </div>
          </div>

          {/* Card 3: Resulting Working Days */}
          <div style={{ 
            background: 'var(--brit-green-light)', 
            border: '1.5px solid #B8E49A', 
            borderRadius: 18, 
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 4px 15px rgba(105, 179, 45, 0.12)'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFFFFF', color: 'var(--brit-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #B8E49A' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#3A7010', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Working Days (Excl. Sun)
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#275207', letterSpacing: -0.5 }}>
                {calculation.workingDays} Working Days
              </div>
              <div style={{ fontSize: 11, color: '#3A7010', fontWeight: 700, marginTop: 2 }}>
                Formula: {calculation.totalDays} – {calculation.sundaysCount} = {calculation.workingDays}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid View Accordion */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button 
              type="button"
              onClick={() => setShowCalendarGrid(!showCalendarGrid)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}
            >
              <Calendar size={16} color="var(--brit-red)" />
              <span>{showCalendarGrid ? 'Hide Monthly Calendar Breakdown' : 'Show Monthly Calendar Breakdown (Sunday Off View)'}</span>
              <span style={{ fontSize: 11, background: 'var(--brit-cream)', padding: '2px 8px', borderRadius: 9999, color: 'var(--slate)' }}>
                {calculation.monthLabel}
              </span>
            </button>
          </div>

          <AnimatePresence>
            {showCalendarGrid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ 
                  background: 'var(--brit-cream-light)', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: 16, 
                  padding: '16px',
                  marginBottom: 16
                }}>
                  {/* Calendar Weekday Headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8, textAlign: 'center' }}>
                    {WEEKDAYS_MON_FIRST.map((wdName, i) => {
                      const isSun = i === 6 // Sunday is last in Monday-first
                      return (
                        <div 
                          key={wdName} 
                          style={{ 
                            fontSize: 12, 
                            fontWeight: 900, 
                            padding: '6px 4px', 
                            borderRadius: 8, 
                            background: isSun ? '#FDE8E8' : 'transparent',
                            color: isSun ? 'var(--brit-red)' : 'var(--slate)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          {wdName} {isSun ? '(Off)' : ''}
                        </div>
                      )
                    })}
                  </div>

                  {/* Calendar Days Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                    {/* Empty placeholder cells for days before the 1st */}
                    {Array.from({ length: calculation.startDayOffset }).map((_, idx) => (
                      <div key={`offset-${idx}`} style={{ height: 42, background: 'rgba(0,0,0,0.02)', borderRadius: 10 }} />
                    ))}

                    {/* Actual Month Days */}
                    {calculation.calendarDays.map(d => {
                      const isToday = 
                        d.dayNumber === today.getDate() && 
                        calculation.monthIndex === currentMonthIndex && 
                        calculation.year === currentYear

                      return (
                        <div
                          key={d.dateString}
                          style={{
                            height: 42,
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            border: isToday ? '2px solid var(--brit-red)' : '1px solid var(--border)',
                            background: d.isSunday ? '#FFF1F2' : '#FFFFFF',
                            color: d.isSunday ? 'var(--brit-red)' : 'var(--navy)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: d.isSunday ? 900 : 700 }}>
                            {d.dayNumber}
                          </span>
                          {d.isSunday && (
                            <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brit-red)' }}>
                              Off
                            </span>
                          )}
                          {isToday && (
                            <span style={{ 
                              position: 'absolute', 
                              top: 2, 
                              right: 2, 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              background: 'var(--brit-red)' 
                            }} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Legend Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 4, background: '#FFFFFF', border: '1px solid var(--border)' }} />
                      <span>Working Day ({calculation.workingDays} Days)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 4, background: '#FFF1F2', border: '1px solid #FCD4D4' }} />
                      <span style={{ color: 'var(--brit-red)' }}>Sunday Excluded ({calculation.sundaysCount} Days)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Rate Impact Preview Box */}
        <div style={{ 
          background: 'var(--brit-cream-light)', 
          border: '1.5px dashed var(--border-dark)', 
          borderRadius: 16, 
          padding: '16px 20px', 
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--brit-red)', letterSpacing: 1 }}>
              💡 Live Daily Rate Impact Preview
            </div>
            <div style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600, marginTop: 4 }}>
              Calculated using: <strong>Base Daily Rate = Monthly Gross Salary ÷ {workingDaysInput || 26} days</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700 }}>₹27,000 / month staff:</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>
                {fmt(sampleDailyRate1)} <span style={{ fontSize: 12, fontWeight: 600 }}>/ day</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700 }}>₹17,500 / month staff:</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>
                {fmt(sampleDailyRate2)} <span style={{ fontSize: 12, fontWeight: 600 }}>/ day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Confirmation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 20,
          background: 'linear-gradient(90deg, #FFFFFF 0%, var(--brit-cream-light) 100%)',
          padding: '18px 24px',
          borderRadius: 18,
          border: '2px solid var(--border)'
        }}>
          {/* Working Days Input with Fine-tuning */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--navy)' }}>
              Working Days for {calculation.monthName}:
            </span>
            <input 
              type="number" 
              min={1} 
              max={31} 
              value={workingDaysInput}
              onChange={e => {
                setWorkingDaysInput(Number(e.target.value))
                setIsManualOverride(true)
              }}
              style={{ 
                width: 84, 
                height: 44, 
                textAlign: 'center', 
                borderRadius: 9999, 
                border: '2px solid var(--brit-red)', 
                background: '#FFFFFF', 
                fontSize: 18, 
                fontWeight: 900, 
                color: 'var(--navy)', 
                outline: 'none',
                boxShadow: '0 2px 8px rgba(227,30,36,0.1)'
              }} 
            />

            {isManualOverride && (
              <button
                type="button"
                onClick={resetToAutoCalculated}
                style={{
                  background: 'none',
                  border: '1px dashed var(--slate)',
                  borderRadius: 9999,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--slate)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RotateCcw size={12} />
                <span>Reset to Auto ({calculation.workingDays})</span>
              </button>
            )}
          </div>

          {/* Scope option & Save Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={applyToFuture} 
                onChange={e => setApplyToFuture(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: 'var(--brit-red)', cursor: 'pointer' }}
              />
              <span>Apply from this month to future months</span>
            </label>

            <button 
              type="button"
              className="btn btn-primary" 
              disabled={saving}
              onClick={handleSaveAndApply}
              style={{ 
                height: 46, 
                padding: '0 26px', 
                fontSize: 14, 
                fontWeight: 900,
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 6px 20px rgba(227,30,36,0.25)'
              }}
            >
              {saving ? 'Updating...' : `Apply ${workingDaysInput} Working Days`}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
