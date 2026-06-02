'use client'

import { Share2, Check } from 'lucide-react'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

export default function ShareProfileButton() {
  const [copied, setCopied] = useState(false)

  function share() {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={share}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.05]"
    >
      {copied
        ? <Check size={15} className="text-green-400 shrink-0" />
        : <Share2 size={15} className="text-white/40 shrink-0" />}
      <span className="text-sm flex-1 text-left transition-colors" style={{ color: copied ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
        {copied ? 'Copied!' : 'Share Profile'}
      </span>
      {!copied && <ChevronRight size={14} className="text-white/20" />}
    </button>
  )
}
