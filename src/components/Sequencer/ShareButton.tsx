import { useState } from 'react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (non-secure context or permission denied)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 rounded text-xs font-mono border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
    >
      {copied ? '✓ Copied!' : 'Share Room'}
    </button>
  )
}
