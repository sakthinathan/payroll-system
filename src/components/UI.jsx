import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertTriangle } from 'lucide-react'

export function Panel({ title, subtitle, children, noPad, headerColor, icon }) {
  return (
    <div className="glass-panel" style={{ padding: noPad ? 0 : '28px' }}>
      {(title || subtitle) && (
        <div style={{ padding: noPad ? '28px 28px 18px' : '0 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--brit-red)', letterSpacing: '-0.3px', textTransform: 'uppercase' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 600, marginTop: 4 }}>{subtitle}</p>}
          </div>
          {icon && <div style={{ fontSize: 24, opacity: 0.3 }}>{icon}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 44, height: 44, border: '4px solid #EFE8D3', borderTopColor: 'var(--brit-red)', borderRadius: '50%' }}
      />
      <span style={{ marginTop: 16, fontSize: 13, fontWeight: 800, color: 'var(--brit-red)', letterSpacing: 1.5 }}>LOADING...</span>
    </div>
  )
}

export function Modal({ title, children, onClose, onSave, saveLabel = 'Save Changes' }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: 560, padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', border: '2px solid var(--border)' }}
      >
        <div style={{ padding: '24px 32px', background: 'var(--brit-cream-light)', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--brit-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '32px' }}>
          {children}
        </div>
        <div style={{ padding: '20px 32px', background: 'var(--brit-cream-light)', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--border)', color: 'var(--navy)' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}>{saveLabel}</button>
        </div>
      </motion.div>
    </div>
  )
}

export function Confirm({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: 420, textAlign: 'center', padding: 40 }}
      >
        <div style={{ width: 64, height: 64, background: '#FDE8E8', color: 'var(--brit-red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertTriangle size={32} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy)', marginBottom: 8 }}>Are you sure?</h3>
        <p style={{ color: 'var(--slate)', fontWeight: 600, fontSize: 14, marginBottom: 32 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" style={{ flex: 1, background: '#fff', border: '2px solid var(--border)', color: 'var(--navy)' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>Yes, Delete</button>
        </div>
      </motion.div>
    </div>
  )
}

export function Field({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginLeft: 4 }}>{label}</label>
      {children}
    </div>
  )
}
