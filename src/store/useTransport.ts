import { create } from 'zustand'
import { AudioEngine, GridSnapshot } from '../audio/AudioEngine'

interface TransportStore {
  isPlaying: boolean
  currentStep: number
  bpm: number
  engine: AudioEngine | null
  initEngine: (getGrid: () => GridSnapshot) => void
  play: () => void
  stop: () => void
  setBpm: (bpm: number) => void
  setCurrentStep: (step: number) => void
}

export const useTransport = create<TransportStore>((set, get) => ({
  isPlaying: false,
  currentStep: -1,
  bpm: 120,
  engine: null,

  initEngine: (getGrid) => {
    const existing = get().engine
    if (existing) existing.destroy()

    const engine = new AudioEngine(getGrid, (step) => {
      get().setCurrentStep(step)
    })
    engine.bpm = get().bpm
    set({ engine })
  },

  play: () => {
    const engine = get().engine
    if (!engine) return
    engine.start()
    set({ isPlaying: true })
  },

  stop: () => {
    get().engine?.stop()
    set({ isPlaying: false, currentStep: -1 })
  },

  setBpm: (bpm) => {
    const engine = get().engine
    if (engine) engine.bpm = bpm
    set({ bpm })
  },

  setCurrentStep: (step) => set({ currentStep: step }),
}))
