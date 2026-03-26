import { nanoid } from "nanoid";
import { Sequencer } from "./components/Sequencer/Sequencer";
import { RoomProvider } from "./collaboration/RoomProvider";
import { ShareButton } from "./components/Sequencer/ShareButton";
import { NewRoomButton } from "./components/NewRoomButton";

function getRoomId(): string | null {
  return new URLSearchParams(window.location.search).get("room");
}

function navigateToRoom(id: string) {
  window.location.href = `${window.location.origin}?room=${id}`;
}

function LandingPage() {
  function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem("code") as HTMLInputElement).value.trim();
    if (!input) return;
    // Accept either a full URL or a bare room code
    try {
      const id = new URL(input).searchParams.get("room");
      if (id) return navigateToRoom(id);
    } catch {
      // not a URL — treat as bare code
    }
    navigateToRoom(input);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-10">
      <h1 className="text-4xl font-bold font-mono tracking-tight">Jam Board</h1>
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => navigateToRoom(nanoid(8))}
          className="px-6 py-3 rounded bg-zinc-100 text-zinc-950 font-mono font-semibold hover:bg-white transition-colors"
        >
          Create Room
        </button>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            name="code"
            placeholder="Paste room URL or code"
            className="px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 font-mono text-sm outline-none focus:border-zinc-400 w-56"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded border border-zinc-700 text-zinc-400 font-mono text-sm hover:text-zinc-100 hover:border-zinc-500 transition-colors"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const roomId = getRoomId();

  if (!roomId) return <LandingPage />;

  return (
    <RoomProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">Jam Board</h1>
          <ShareButton />
          <NewRoomButton />
        </div>
        <Sequencer />
      </div>
    </RoomProvider>
  );
}
