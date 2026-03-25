import { Sequencer } from './components/Sequencer/Sequencer'
import { RoomProvider } from './collaboration/RoomProvider'
import { ShareButton } from './components/Sequencer/ShareButton'
import { NewRoomButton } from './components/NewRoomButton'

export default function App() {
  return (
    <RoomProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            Music Bench
          </h1>
          <ShareButton />
          <NewRoomButton />
        </div>
        <Sequencer />
      </div>
    </RoomProvider>
  )
}
