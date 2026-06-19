export function relativeTime(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 5)    return 'just now'
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  }
  const d = Math.floor(diff / 86400)
  return `${d}${d === 1 ? 'd' : 'd'} ago`
}

export function exactTime(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}
