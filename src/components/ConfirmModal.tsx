'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ShieldBan, Loader2 } from 'lucide-react'

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

const COLORS: Record<Variant, { iconBg: string; iconBorder: string; icon: string; btn: string; btnHover: string }> = {
  danger:  {
    iconBg:     'rgba(231,76,60,0.15)',
    iconBorder: 'rgba(231,76,60,0.35)',
    icon:       '#E74C3C',
    btn:        '#E74C3C',
    btnHover:   '#C0392B',
  },
  warning: {
    iconBg:     'rgba(243,156,18,0.15)',
    iconBorder: 'rgba(243,156,18,0.35)',
    icon:       '#F39C12',
    btn:        '#F39C12',
    btnHover:   '#D68910',
  },
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onCancel}
          />

          {/* Card */}
          <motion.div
            className="relative modal rounded-2xl w-full max-w-sm overflow-hidden"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{   scale: 0.92, opacity: 0, y: 20  }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}>

            {/* Top accent line */}
            <div
              className="h-[2px] w-full"
              style={{ background: `linear-gradient(90deg, transparent, ${c.icon}66, transparent)` }}
            />

            <div className="p-7">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: c.iconBg, border: `1.5px solid ${c.iconBorder}` }}>
                <Icon size={24} style={{ color: c.icon }} />
              </div>

              {/* Text */}
              <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
              <p className="text-sm text-white/65 text-center leading-relaxed mb-7">{message}</p>

              {/* Divider */}
              <div className="h-px bg-white/[0.07] -mx-7 mb-6" />

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.98]"
                  style={{ background: c.btn, boxShadow: `0 4px 16px ${c.icon}40` }}>
                  {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
