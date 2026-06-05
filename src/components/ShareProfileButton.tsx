'use client'

import { Share2, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

interface Props {
  name?: string
  profession?: string
}

export default function ShareProfileButton({ name, profession }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'shared'>('idle')

  async function share() {
    const url  = window.location.href
    const title = name ? `${name} on Vibro` : 'Vibro — Elite Discovery'
    const text  = profession
      ? `Check out ${name}'s profile — ${profession} on Vibro`
      : `Check out this profile on Vibro — Elite Discovery`

    // Native share sheet (iOS, Android, Chrome desktop)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        setState('shared')
        setTimeout(() => setState('idle'), 2000)
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Legacy fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setState('copied')
    setTimeout(() => setState('idle'), 2000)
  }

  const icon = state === 'shared' || state === 'copied'
    ? <Check size={15} className="text-green-400 shrink-0" />
    : <Share2 size={15} className="text-white/40 shrink-0" />

  const label = state === 'shared'
    ? 'Shared!'
    : state === 'copied'
      ? 'Link copied!'
      : 'Share Profile'

  return (
    <button
      onClick={share}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.05]"
    >
      {icon}
      <span
        className="text-sm flex-1 text-left transition-colors"
        style={{ color: state !== 'idle' ? '#4ade80' : 'rgba(255,255,255,0.7)' }}
      >
        {label}
      </span>
      {state === 'idle' && <ChevronRight size={14} className="text-white/20" />}
      {state === 'copied' && <Copy size={13} className="text-green-400/60 shrink-0" />}
    </button>
  )
}
