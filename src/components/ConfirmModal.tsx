'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ShieldBan, Trash2, Loader2 } from 'lucide-react'

type Variant = 'danger' | 'warning'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ICONS: Record<Variant, React.ElementType> = {
  danger:  ShieldBan,
  warning: AlertTriangle,
}

const COLORS: Record<Variant, { bg: string; border: string; icon: string; btn: string }> = {
  danger:  { bg: 'rgba(231,76,60,0.12)',  border: 'rgba(231,76,60,0.3)',  icon: '#E74C3C', btn: '#E74C3C' },
  warning: { bg: 'rgba(243,156,18,0.12)', border: 'rgba(243,156,18,0.3)', icon: '#F39C12', btn: '#F39C12' },
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const c = COLORS[variant]
  const Icon = ICONS[variant]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            className="relative glass rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <Icon size={22} style={{ color: c.icon }} />
            </div>

            {/* Text */}
            <h3 className="text-lg font-bold text-white text-center mb-1">{title}</h3>
            <p className="text-sm text-white/45 text-center leading-relaxed mb-6">{message}</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 h-11 glass rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-colors disabled:opacity-40">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                style={{ background: c.btn }}>
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
