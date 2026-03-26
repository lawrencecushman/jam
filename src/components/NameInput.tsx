import { useRef, useState } from "react";
import { usePresence } from "../collaboration/usePresence";
import { useRoom } from "../collaboration/RoomProvider";

export function NameInput() {
  const { doc } = useRoom();
  const { users, setDisplayName } = usePresence();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const myUserId = doc.clientID.toString();
  const me = users.find((u) => u.userId === myUserId);
  const currentName = me?.displayName ?? "…";

  function startEditing() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const val = inputRef.current?.value ?? "";
    if (val.trim()) setDisplayName(val.trim());
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      cancelledRef.current = true;
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={currentName}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        maxLength={32}
        className="w-32 px-1 py-0.5 rounded text-xs font-mono bg-zinc-800 border border-zinc-600 text-zinc-100 outline-none focus:border-zinc-400"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEditing}
      title="Click to change your name"
      className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors group"
    >
      <span>{currentName}</span>
      <span
        className="opacity-0 group-hover:opacity-60 transition-opacity text-zinc-500"
        aria-hidden
      >
        ✎
      </span>
    </button>
  );
}
