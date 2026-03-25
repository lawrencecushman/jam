import { SYNTH_MAP, TrackId } from './instruments'

// How far ahead to schedule (seconds)
const SCHEDULE_AHEAD_TIME = 0.1
// How often to call the scheduler (ms)
const LOOKAHEAD_INTERVAL = 25

export type GridSnapshot = Record<TrackId, boolean[]>

export class AudioEngine {
  private ctx: AudioContext | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private nextNoteTime = 0
  private currentStep = 0
  private _bpm = 120
  private getGrid: () => GridSnapshot
  private onStep: (step: number) => void

  constructor(getGrid: () => GridSnapshot, onStep: (step: number) => void) {
    this.getGrid = getGrid
    this.onStep = onStep
  }

  get bpm() {
    return this._bpm
  }

  set bpm(value: number) {
    this._bpm = Math.max(40, Math.min(240, value))
  }

  private get stepDuration() {
    // 16th note duration in seconds
    return 60 / (this._bpm * 4)
  }

  start() {
    if (this.intervalId !== null) return

    // AudioContext must be created/resumed after a user gesture
    if (!this.ctx) {
      this.ctx = new AudioContext()
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    this.currentStep = 0
    this.nextNoteTime = this.ctx.currentTime

    this.intervalId = setInterval(() => this.tick(), LOOKAHEAD_INTERVAL)
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private tick() {
    if (!this.ctx) return

    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      this.scheduleStep(this.currentStep, this.nextNoteTime)
      this.nextNoteTime += this.stepDuration
      const step = this.currentStep
      this.currentStep = (this.currentStep + 1) % 16

      // Notify React at the moment the step SHOULD play
      const delay = (this.nextNoteTime - this.stepDuration - this.ctx.currentTime) * 1000
      setTimeout(() => this.onStep(step), Math.max(0, delay))
    }
  }

  private scheduleStep(step: number, when: number) {
    if (!this.ctx) return
    const grid = this.getGrid()
    for (const [trackIdStr, steps] of Object.entries(grid)) {
      const trackId = trackIdStr as TrackId
      if (steps[step]) {
        SYNTH_MAP[trackId](this.ctx, when)
      }
    }
  }

  destroy() {
    this.stop()
    this.ctx?.close()
    this.ctx = null
  }
}
