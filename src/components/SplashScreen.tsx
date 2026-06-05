'use client'

import { motion } from 'framer-motion'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div
      key="vibro-splash"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: '#0A0A0B' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full"
          style={{ background: 'rgba(201,168,76,0.06)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full"
          style={{ background: 'rgba(201,168,76,0.06)', filter: 'blur(120px)' }}
        />
      </div>

      {/* Brand identity */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E5C76B)' }}
          animate={{
            boxShadow: [
              '0 0 20px rgba(201,168,76,0.12)',
              '0 0 64px rgba(201,168,76,0.40)',
              '0 0 20px rgba(201,168,76,0.12)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        >
          <svg width="48" height="43" viewBox="0 0 20 18" fill="none" aria-hidden="true">
            <path
              d="M1.5 2C4 12 9 16 9 16C9 16 14 12 18.5 2"
              stroke="black" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="1.5" cy="2" r="1.5" fill="black" />
            <circle cx="18.5" cy="2" r="1.5" fill="black" />
          </svg>
        </motion.div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-3">VIBRO</h1>

        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-white/10" />
          <span
            className="text-[10px] uppercase tracking-[0.5em] font-bold"
            style={{ color: '#C9A84C' }}
          >
            Elite Discovery
          </span>
          <div className="h-px w-6 bg-white/10" />
        </div>
      </motion.div>

      {/* Progress bar */}
      <div
        className="absolute bottom-20 w-48 h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#C9A84C' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          onAnimationComplete={onComplete}
        />
      </div>
    </motion.div>
  )
}
