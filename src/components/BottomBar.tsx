import { useRoom } from "../collaboration/RoomProvider";
import { usePresence } from "../collaboration/usePresence";
import { NameInput } from "./NameInput";
import { ShareButton } from "./Sequencer/ShareButton";
import { NewRoomButton } from "./NewRoomButton";

function Avatar({ color, name }: { color: string; name: string }) {
  return (
    <div
      title={name}
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black cursor-default select-none"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0)}
    </div>
  );
}

export function BottomBar() {
  const { doc } = useRoom();
  const { users } = usePresence();

  const myUserId = doc.clientID.toString();
  const me = users.find((u) => u.userId === myUserId);
  const remotes = users.filter((u) => u.userId !== myUserId);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center">
      {/* Left: own avatar + editable name */}
      <div className="flex items-center gap-2 flex-1">
        {me && <Avatar color={me.color} name={me.displayName} />}
        <NameInput />
      </div>

      {/* Middle: room buttons */}
      <div className="flex items-center gap-2">
        <ShareButton />
        <NewRoomButton />
      </div>

      {/* Right: remote users */}
      <div className="flex-1 flex flex-col items-end gap-1">
        {remotes.length > 0 && (
          <>
            <div className="flex gap-1">
              {remotes.map((u) => (
                <Avatar key={u.userId} color={u.color} name={u.displayName} />
              ))}
            </div>
            <span className="text-xs font-mono text-zinc-500">{remotes.length} joined</span>
          </>
        )}
      </div>
    </div>
  );
}
