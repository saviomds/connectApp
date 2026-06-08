'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const KEY = 'vibro_swipe_tutorial_seen'

export default function SwipeTutorial() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 relative"
        style={{ background: 'var(--app-modal)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <X size={15} />
        </button>

        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--app-text)' }}>How to swipe</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--app-text-3)' }}>Swipe or tap the buttons below each card</p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { dir: '←', color: '#E8637A', bg: 'rgba(232,99,122,0.1)', border: 'rgba(232,99,122,0.2)', label: 'Pass', sub: 'Swipe left or tap ✕' },
            { dir: '⭐', color: '#C9A84C', bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.2)', label: 'Super Like', sub: 'Tap the star' },
            { dir: '→', color: '#2ECC71',  bg: 'rgba(46,204,113,0.1)',  border: 'rgba(46,204,113,0.2)',  label: 'Like', sub: 'Swipe right or tap ♥' },
          ].map(({ dir, color, bg, border, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-2xl"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <span className="text-2xl font-bold" style={{ color }}>{dir}</span>
              <span className="text-xs font-semibold" style={{ color }}>{label}</span>
              <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--app-text-3)' }}>{sub}</span>
            </div>
          ))}
        </div>

        <button onClick={dismiss}
          className="w-full h-11 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#E5C76B)' }}>
          Got it — let&apos;s go!
        </button>
      </div>
    </div>
  )
}
