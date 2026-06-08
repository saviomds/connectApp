/** Singleton AudioContext — survives across Realtime events */
let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return _ctx
  } catch {
    return null
  }
}

function doPlay(ctx: AudioContext) {
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18)

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* unsupported — silent fail */ }
}

/**
 * Call this on any user gesture (input focus, button click) to pre-unlock
 * the AudioContext. Browsers require a gesture before audio can play.
 */
export function unlockAudio() {
  try {
    const ctx = getCtx()
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
  } catch { /* noop */ }
}

/** Play a soft descending ding when a new message arrives */
export function playMessageSound() {
  try {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => doPlay(ctx)).catch(() => {})
    } else {
      doPlay(ctx)
    }
  } catch { /* noop */ }
}
