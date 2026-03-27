import { useRoom } from "../collaboration/RoomProvider";
import { usePresence } from "../collaboration/usePresence";
import { useSyncTransport } from "../collaboration/useSyncTransport";
import { NameInput } from "./NameInput";
import { ShareButton } from "./Sequencer/ShareButton";
import { NewRoomButton } from "./NewRoomButton";

function Avatar({ color, name }: { color: string; name: string }) {
  return (
    <div
      title={name}
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black cursor-default select-none"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0)}
    </div>
  );
}

export function BottomBar() {
  const { doc } = useRoom();
  const { users } = usePresence();
  const { syncEnabled, toggleSync } = useSyncTransport();

  const myUserId = doc.clientID.toString();
  const me = users.find((u) => u.userId === myUserId);
  const remotes = users.filter((u) => u.userId !== myUserId);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 px-3 sm:px-6 py-3 flex items-center gap-2">
      {/* Left: own avatar + editable name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {me && <Avatar color={me.color} name={me.displayName} />}
        <NameInput />
      </div>

      {/* Middle: room buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <ShareButton />
        <NewRoomButton />
      </div>

      {/* Right: sync button + remote users */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1">
        <button
          onClick={toggleSync}
          aria-pressed={syncEnabled}
          title={
            syncEnabled
              ? "Sync on — your play/stop is shared with the room"
              : "Sync off — your transport is independent"
          }
          className={[
            "px-2 sm:px-3 py-1 rounded text-xs font-mono border transition-colors shrink-0",
            syncEnabled
              ? "border-blue-600 text-blue-400 bg-blue-950"
              : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500",
          ].join(" ")}
        >
          <span className="hidden sm:inline">{syncEnabled ? "⟳ Sync On" : "⟳ Sync Off"}</span>
          <span className="sm:hidden">⟳</span>
        </button>

        {remotes.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1">
              {remotes.map((u) => (
                <Avatar key={u.userId} color={u.color} name={u.displayName} />
              ))}
            </div>
            <span className="text-xs font-mono text-zinc-500">{remotes.length} joined</span>
          </div>
        )}
      </div>
    </div>
  );
}
