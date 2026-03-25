import { nanoid } from 'nanoid'

export function NewRoomButton() {
  function handleClick() {
    window.location.href = window.location.origin + '?room=' + nanoid(8)
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1 rounded text-xs font-mono border border-zinc-700 text-zinc-600 hover:text-red-400 hover:border-red-800 transition-colors"
    >
      New Room
    </button>
  )
}
