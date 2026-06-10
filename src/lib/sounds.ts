/** Singleton AudioContext — reused across all sound events */
let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      _ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    }
    return _ctx
  } catch {
    return null
  }
}

function withCtx(fn: (ctx: AudioContext) => void) {
  try {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => fn(ctx)).catch(() => {})
    } else {
      fn(ctx)
    }
  } catch { /* noop */ }
}

/**
 * Call on any user gesture to pre-unlock the AudioContext.
 * Browsers require a gesture before audio can play.
 */
export function unlockAudio() {
  try {
    const ctx = getCtx()
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
  } catch { /* noop */ }
}

// ─── Match — warm rising arpeggio + shimmer ────────────────────────────────
// E4 → G#4 → B4 → E5 major arpeggio, each note 70ms apart, last one sustained.
// Feels triumphant but soft — like Tinder's match sound but more refined.
function _match(ctx: AudioContext) {
  const t = ctx.currentTime
  const notes = [329.63, 415.30, 493.88, 659.25] // E4 G#4 B4 E5

  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = i === 3 ? 'triangle' : 'sine'
    osc.frequency.setValueAtTime(freq, t)

    const start   = t + i * 0.075
    const sustain = i === 3 ? 0.55 : 0.18
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(i === 3 ? 0.20 : 0.15, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.001, start + sustain)
    osc.start(start)
    osc.stop(start + sustain + 0.05)
  })

  // High shimmer on top — E6 sparkle fading in after arpeggio
  const shimmer  = ctx.createOscillator()
  const shimGain = ctx.createGain()
  shimmer.connect(shimGain)
  shimGain.connect(ctx.destination)
  shimmer.type = 'sine'
  shimmer.frequency.setValueAtTime(1318.5, t + 0.3)
  shimmer.frequency.exponentialRampToValueAtTime(1568, t + 0.55)
  shimGain.gain.setValueAtTime(0, t + 0.3)
  shimGain.gain.linearRampToValueAtTime(0.07, t + 0.36)
  shimGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
  shimmer.start(t + 0.3)
  shimmer.stop(t + 0.75)
}

export function playMatchSound() {
  withCtx(_match)
}

// ─── Super Like — rising sweep + two sparkle notes ────────────────────────
// Ascending glissando 600→1400 Hz, then D6→G6. Feels magical and special.
function _superLike(ctx: AudioContext) {
  const t = ctx.currentTime

  const sweep     = ctx.createOscillator()
  const sweepGain = ctx.createGain()
  sweep.connect(sweepGain)
  sweepGain.connect(ctx.destination)
  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(600, t)
  sweep.frequency.exponentialRampToValueAtTime(1400, t + 0.2)
  sweepGain.gain.setValueAtTime(0, t)
  sweepGain.gain.linearRampToValueAtTime(0.12, t + 0.04)
  sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  sweep.start(t)
  sweep.stop(t + 0.25)

  // D6 then G6 sparkles
  const sparkFreqs = [1174.66, 1568.0]
  sparkFreqs.forEach((freq, i) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    const s = t + 0.22 + i * 0.1
    gain.gain.setValueAtTime(0, s)
    gain.gain.linearRampToValueAtTime(0.10, s + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, s + 0.22)
    osc.start(s)
    osc.stop(s + 0.25)
  })
}

export function playSuperLikeSound() {
  withCtx(_superLike)
}

// ─── Like — soft upward tap ────────────────────────────────────────────────
// A short ascending sine burst — satisfying, subtle, positive.
function _like(ctx: AudioContext) {
  const t    = ctx.currentTime
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, t)
  osc.frequency.exponentialRampToValueAtTime(550, t + 0.09)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.12, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
  osc.start(t)
  osc.stop(t + 0.14)
}

export function playLikeSound() {
  withCtx(_like)
}

// ─── Pass — barely-there soft thud ────────────────────────────────────────
// Subtle low sine drop. Not negative — just a light tactile cue.
function _pass(ctx: AudioContext) {
  const t    = ctx.currentTime
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, t)
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.09)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.07, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
  osc.start(t)
  osc.stop(t + 0.12)
}

export function playPassSound() {
  withCtx(_pass)
}

// ─── Message — warm descending ding ────────────────────────────────────────
// A→F# soft sine chime. Clean and gentle, non-intrusive.
function _message(ctx: AudioContext) {
  const t    = ctx.currentTime
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(740, t + 0.18)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.18, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.30)
  osc.start(t)
  osc.stop(t + 0.32)
}

export function playMessageSound() {
  withCtx(_message)
}

// ─── Notification — clean two-tone chime ──────────────────────────────────
// G5 then C6, like a refined door bell. Used for super-like / misc notifs.
function _notification(ctx: AudioContext) {
  const t     = ctx.currentTime
  const notes = [784, 1046.5] // G5, C6
  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    const s = t + i * 0.16
    gain.gain.setValueAtTime(0, s)
    gain.gain.linearRampToValueAtTime(0.14, s + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, s + 0.32)
    osc.start(s)
    osc.stop(s + 0.35)
  })
}

export function playNotificationSound() {
  withCtx(_notification)
}
