import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertTriangle } from 'lucide-react'

export function Panel({ title, subtitle, children, noPad, headerColor, icon }) {
  return (
    <div className="glass-panel" style={{ padding: noPad ? 0 : '24px' }}>
      {(title || subtitle) && (
        <div style={{ padding: noPad ? '24px 24px 16px' : '0 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.3px' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--slate)', opacity: 0.6, fontWeight: 500, marginTop: 2 }}>{subtitle}</p>}
          </div>
          {icon && <div style={{ fontSize: 24, opacity: 0.2 }}>{icon}</div>}
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
        style={{ width: 40, height: 40, border: '4px solid #f1f5f9', borderTopColor: 'var(--blue)', borderRadius: '50%' }}
      />
      <span style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: 'var(--slate)', opacity: 0.5, letterSpacing: 1 }}>LOADING...</span>
    </div>
  )
}

export function Modal({ title, children, onClose, onSave, saveLabel = 'Save Changes' }) {
  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: 540, padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#f8fafc', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '32px' }}>
          {children}
        </div>
        <div style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn" style={{ background: '#fff', border: '1px solid #e2e8f0', color: 'var(--slate)' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-blue" onClick={onSave}>{saveLabel}</button>
        </div>
      </motion.div>
    </div>
  )
}

export function Confirm({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: 400, textAlign: 'center', padding: 40 }}
      >
        <div style={{ width: 64, height: 64, background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertTriangle size={32} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>Are you sure?</h3>
        <p style={{ color: 'var(--slate)', opacity: 0.6, fontSize: 14, marginBottom: 32 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" style={{ flex: 1, background: '#f1f5f9', border: 'none', color: 'var(--slate)' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>Yes, Delete</button>
        </div>
      </motion.div>
    </div>
  )
}

export function Field({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginLeft: 4 }}>{label}</label>
      {children}
    </div>
  )
}
