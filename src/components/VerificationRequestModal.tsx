'use client'

import { useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Camera, Upload, CheckCircle, Loader2, ShieldCheck,
  User, CreditCard, ScanLine, ChevronRight, ChevronLeft, Clock,
} from 'lucide-react'

interface Props {
  category: string
  categoryLabel: string
  onClose: () => void
  onSubmitted: () => void
}

interface PhotoSlot {
  key: 'photo_selfie' | 'photo_id' | 'photo_portrait'
  label: string
  hint: string
  icon: React.ElementType
  captureCamera: 'user' | 'environment'
}

const SLOTS: PhotoSlot[] = [
  {
    key: 'photo_portrait',
    label: 'Portrait photo',
    hint: 'Clear photo of your face, good lighting, no filters',
    icon: User,
    captureCamera: 'user',
  },
  {
    key: 'photo_id',
    label: 'ID / Passport scan',
    hint: 'Hold your ID or passport flat — all text must be legible',
    icon: CreditCard,
    captureCamera: 'environment',
  },
  {
    key: 'photo_selfie',
    label: 'Selfie holding your ID',
    hint: 'Hold your ID beside your face so both are visible',
    icon: ScanLine,
    captureCamera: 'user',
  },
]

// ─── Single photo step ────────────────────────────────────────
function PhotoStep({
  slot,
  preview,
  onFile,
  onClear,
}: {
  slot: PhotoSlot
  preview: string | null
  onFile: (f: File) => void
  onClear: () => void
}) {
  const cameraId  = useId()
  const galleryId = useId()
  const Icon = slot.icon

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) onFile(f)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.14)', border: '1.5px solid rgba(201,168,76,0.30)' }}>
        <Icon size={28} style={{ color: '#C9A84C' }} />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1.5">{slot.label}</h3>
        <p className="text-sm text-white/65 max-w-xs leading-relaxed">{slot.hint}</p>
      </div>

      {preview ? (
        <div className="relative w-full max-w-xs">
          <img
            src={preview}
            alt="preview"
            className="w-full rounded-2xl object-cover border border-white/10"
            style={{ maxHeight: 220 }}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 flex items-center justify-center border border-white/10 hover:bg-black transition-colors">
            <X size={14} className="text-white" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
            <CheckCircle size={13} style={{ color: '#2ECC71' }} />
            <span className="text-xs text-white/85 font-medium">Photo ready</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <label
            htmlFor={cameraId}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold cursor-pointer transition-all active:scale-[0.98]"
            style={{ background: '#C9A84C', color: '#000', boxShadow: '0 4px 16px rgba(201,168,76,0.35)' }}>
            <Camera size={16} />
            Take Photo
          </label>
          <input id={cameraId} type="file" accept="image/*" capture={slot.captureCamera} className="sr-only" onChange={pick} />

          <label
            htmlFor={galleryId}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-medium cursor-pointer transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: 'rgba(255,255,255,0.75)' }}>
            <Upload size={15} />
            Upload from Gallery
          </label>
          <input id={galleryId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} />
        </div>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────
export default function VerificationRequestModal({
  category,
  categoryLabel,
  onClose,
  onSubmitted,
}: Props) {
  const [step, setStep]         = useState(0)
  const [files, setFiles]       = useState<Record<string, File | null>>({
    photo_portrait: null, photo_id: null, photo_selfie: null,
  })
  const [previews, setPreviews] = useState<Record<string, string | null>>({
    photo_portrait: null, photo_id: null, photo_selfie: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState('')

  function setFile(key: string, file: File) {
    setFiles(f => ({ ...f, [key]: file }))
    setPreviews(p => ({ ...p, [key]: URL.createObjectURL(file) }))
  }

  function clearFile(key: string) {
    setFiles(f => ({ ...f, [key]: null }))
    setPreviews(p => ({ ...p, [key]: null }))
  }

  const photoStep   = step - 1
  const currentSlot = SLOTS[photoStep]
  const allDone     = SLOTS.every(s => files[s.key] !== null)

  async function submit() {
    if (!allDone) return
    setSubmitting(true)
    setError('')
    const fd = new FormData()
    fd.append('category', category)
    SLOTS.forEach(s => { if (files[s.key]) fd.append(s.key, files[s.key]!) })
    const res = await fetch('/api/verification', { method: 'POST', body: fd })
    if (res.ok) {
      setSubmitting(false)
      setSubmitted(true)
      setTimeout(() => onSubmitted(), 2500)
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Submission failed — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-0 sm:px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <motion.div
        className="relative w-full sm:max-w-md modal rounded-t-3xl sm:rounded-2xl overflow-hidden"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{   y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}>

        {/* Top accent line */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />

        {/* Header */}
        <div className="modal-header flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <ShieldCheck size={16} style={{ color: '#C9A84C' }} />
            </div>
            <span className="font-bold text-white">Identity Verification</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Progress bar (steps 1–3) */}
        {!submitted && step >= 1 && step <= 3 && (
          <div className="flex gap-2 px-5 pt-5">
            {SLOTS.map((s, i) => (
              <div key={s.key} className="flex-1 h-1.5 rounded-full transition-all"
                style={{ background: i < step ? '#C9A84C' : 'rgba(255,255,255,0.10)' }} />
            ))}
          </div>
        )}

        <div className="px-5 py-6 min-h-[340px] flex flex-col justify-between">

          {/* ── Success screen ── */}
          {submitted && (
            <div className="flex flex-col items-center justify-center gap-6 flex-1 text-center py-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(46,204,113,0.13)', border: '2px solid rgba(46,204,113,0.40)' }}>
                  <CheckCircle size={40} style={{ color: '#2ECC71' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)' }}>
                  <ShieldCheck size={16} style={{ color: '#C9A84C' }} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Documents Submitted!</h3>
                <p className="text-sm text-white/65 leading-relaxed max-w-xs">
                  Your verification request is now <strong className="text-white">under review</strong>.
                  We&apos;ll notify you within 24 hours once it&apos;s processed.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full"
                style={{ background: 'rgba(243,156,18,0.10)', border: '1px solid rgba(243,156,18,0.25)' }}>
                <Clock size={13} style={{ color: '#F39C12' }} />
                <span className="text-xs text-white/70 font-medium">Usually reviewed within 24 hours</span>
              </div>
            </div>
          )}

          {/* ── Step 0: Intro ── */}
          {!submitted && step === 0 && (
            <div className="flex flex-col gap-5 flex-1">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Verify to unlock <span style={{ color: '#C9A84C' }}>{categoryLabel}</span>
                </h2>
                <p className="text-sm text-white/65 leading-relaxed">
                  Submit 3 photos for identity review. Our team processes requests within 24 hours.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                {SLOTS.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={s.key} className="modal-row flex items-center gap-3 rounded-xl p-3.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.22)' }}>
                        <Icon size={15} style={{ color: '#C9A84C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{s.label}</p>
                        <p className="text-xs text-white/55 truncate mt-0.5">{s.hint}</p>
                      </div>
                      <span className="text-xs font-bold text-white/35 shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>{i + 1}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-white/40 text-center">Documents are encrypted and never shared publicly.</p>
              <button
                onClick={() => setStep(1)}
                className="w-full h-12 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: '#C9A84C', boxShadow: '0 4px 20px rgba(201,168,76,0.35)' }}>
                Get Started <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Steps 1–3: Photo capture ── */}
          {!submitted && step >= 1 && step <= 3 && (
            <div className="flex flex-col gap-6 flex-1">
              <PhotoStep
                slot={currentSlot}
                preview={previews[currentSlot.key]}
                onFile={f => setFile(currentSlot.key, f)}
                onClear={() => clearFile(currentSlot.key)}
              />
              <div className="flex gap-3 mt-auto">
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="h-11 px-5 rounded-xl text-white/70 hover:text-white flex items-center gap-1.5 text-sm font-medium shrink-0 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!files[currentSlot.key]}
                  className="flex-1 h-11 rounded-xl font-semibold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.98]"
                  style={{ background: '#C9A84C', boxShadow: files[currentSlot.key] ? '0 4px 16px rgba(201,168,76,0.35)' : 'none' }}>
                  {step === 3 ? 'Review' : 'Next'} <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & submit ── */}
          {!submitted && step === 4 && (
            <div className="flex flex-col gap-5 flex-1">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Review your photos</h3>
                <p className="text-sm text-white/60">Make sure all photos are clear and legible.</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {SLOTS.map(s => (
                  <div key={s.key} className="flex flex-col gap-1.5">
                    <div className="aspect-square rounded-xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {previews[s.key]
                        ? <img src={previews[s.key]!} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/20 text-lg">?</div>}
                    </div>
                    <p className="text-[10px] text-white/50 text-center leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-sm text-red-400 text-center px-2 py-2 rounded-lg" style={{ background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.20)' }}>
                  {error}
                </p>
              )}
              <div className="flex gap-3 mt-auto">
                <button type="button" onClick={() => setStep(3)}
                  className="h-11 px-5 rounded-xl text-white/70 hover:text-white flex items-center gap-1.5 text-sm font-medium shrink-0 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !allDone}
                  className="flex-1 h-11 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
                  style={{ background: '#C9A84C', boxShadow: '0 4px 16px rgba(201,168,76,0.35)' }}>
                  {submitting
                    ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                    : <><ShieldCheck size={15} /> Submit for Review</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
