// Each function creates and immediately schedules a percussive sound.
// All nodes are self-contained — no references kept after scheduling.

export function playKick(ctx: AudioContext, when: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(150, when)
  osc.frequency.exponentialRampToValueAtTime(0.001, when + 0.5)

  gain.gain.setValueAtTime(1, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.5)

  osc.start(when)
  osc.stop(when + 0.5)
}

export function playSnare(ctx: AudioContext, when: number): void {
  const bufferSize = ctx.sampleRate * 0.2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1500

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.8, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.2)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(when)
  noise.stop(when + 0.2)
}

export function playClosedHiHat(ctx: AudioContext, when: number): void {
  const bufferSize = ctx.sampleRate * 0.05
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.5, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(when)
  noise.stop(when + 0.05)
}

export function playOpenHiHat(ctx: AudioContext, when: number): void {
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 6000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(when)
  noise.stop(when + 0.3)
}

export function playClap(ctx: AudioContext, when: number): void {
  // Multiple noise bursts layered slightly apart to simulate a clap
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.01
    const bufferSize = ctx.sampleRate * 0.07
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let j = 0; j < bufferSize; j++) {
      data[j] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.5

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.6, when + offset)
    gain.gain.exponentialRampToValueAtTime(0.001, when + offset + 0.07)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(when + offset)
    noise.stop(when + offset + 0.07)
  }
}

export type TrackId = 'kick' | 'snare' | 'hihat-closed' | 'hihat-open' | 'clap'

export const TRACKS: { id: TrackId; label: string }[] = [
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hihat-closed', label: 'CH' },
  { id: 'hihat-open', label: 'OH' },
  { id: 'clap', label: 'Clap' },
]

export const SYNTH_MAP: Record<TrackId, (ctx: AudioContext, when: number) => void> = {
  kick: playKick,
  snare: playSnare,
  'hihat-closed': playClosedHiHat,
  'hihat-open': playOpenHiHat,
  clap: playClap,
}
