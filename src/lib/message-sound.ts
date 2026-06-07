/** Play a soft notification ding using Web Audio API — no audio file needed */
export function playMessageSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    // Short descending tone: 880 Hz → 660 Hz over 180ms
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18)

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    osc.onended = () => ctx.close()
  } catch {
    // AudioContext not supported or blocked — silent fail
  }
}
