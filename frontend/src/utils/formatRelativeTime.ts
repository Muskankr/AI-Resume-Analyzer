export const formatRelativeTime = (isoString: string | null | undefined): string => {
  if (!isoString) return ''

  const now = new Date()
  const past = new Date(isoString)
  const diffMs = now.getTime() - past.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'Updated just now'
  } else if (diffMins < 60) {
    return `Updated ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `Updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays === 1) {
    return 'Updated yesterday'
  } else if (diffDays < 7) {
    return `Updated ${diffDays} days ago`
  } else {
    return `Updated on ${past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  }
}
