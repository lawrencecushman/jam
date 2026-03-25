import { Sequencer } from './components/Sequencer/Sequencer'

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
        Music Bench
      </h1>
      <Sequencer />
    </div>
  )
}
