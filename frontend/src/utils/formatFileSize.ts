/**
 * Format a byte count as a short human-readable string, e.g. `842 KB`,
 * `2.4 MB`. Used by the file preview shown right after selection so users
 * can confirm they picked the right file before analyzing.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  const decimals = exponent === 0 ? 0 : 1

  return `${value.toFixed(decimals)} ${units[exponent]}`
}
