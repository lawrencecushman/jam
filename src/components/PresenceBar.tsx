import type { UserPresence } from '../collaboration/usePresence'

interface PresenceBarProps {
  users: UserPresence[]
}

export function PresenceBar({ users }: PresenceBarProps) {
  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 font-mono">{users.length} online</span>
      <div className="flex gap-1">
        {users.map((u) => (
          <div
            key={u.userId}
            title={u.displayName}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
            style={{ backgroundColor: u.color }}
          >
            {u.displayName.charAt(0)}
          </div>
        ))}
      </div>
    </div>
  )
}
