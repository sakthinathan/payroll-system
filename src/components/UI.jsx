import { useState } from 'react'

export function Modal({ title, onClose, onSave, saveLabel = '💾 Save', children, wide = false }) {
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try { await onSave() } finally { setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {onSave && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : saveLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function Confirm({ message, onConfirm, onClose, danger = true }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <p style={{ fontSize: 14, marginBottom: 20 }}>{message}</p>
        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {danger ? '🗑️ Delete' : '✅ Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function KpiCard({ label, value, sub, icon, color = 'blue' }) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export function Panel({ title, subtitle, headerColor, children, noPad = false, headerRight }) {
  return (
    <div className="panel">
      <div className="panel-header" style={headerColor ? { background: headerColor } : {}}>
        <div>
          <h3>{title}</h3>
          {subtitle && <span style={{ fontSize: 12, opacity: .7 }}>{subtitle}</span>}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className={noPad ? '' : 'panel-body'}>{children}</div>
    </div>
  )
}

export function Spinner({ message = 'Loading...' }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 32, animation: 'spin .8s linear infinite', display: 'inline-block' }}>⏳</div>
      <p style={{ marginTop: 12 }}>{message}</p>
    </div>
  )
}

export function Empty({ icon = '📭', message }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <p>{message}</p>
    </div>
  )
}

export function Field({ label, children, colSpan }) {
  return (
    <div className="form-group" style={colSpan ? { gridColumn: '1/-1' } : {}}>
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'blue' }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}

export function ProgressBar({ value, max, color = 'var(--blue)' }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
