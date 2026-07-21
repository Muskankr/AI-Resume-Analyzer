import { useState, useMemo } from 'react'
import type { AnalysisEntry } from './useAnalysisHistory'

export function useTagFilter(entries: AnalysisEntry[]) {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>()
    entries.forEach((entry) => {
      if (entry.tag && entry.tag.trim()) {
        tagsSet.add(entry.tag.trim())
      }
    })
    return Array.from(tagsSet).sort()
  }, [entries])

  // Reset activeTag if activeTag no longer exists in available tags
  const effectiveTag = availableTags.includes(activeTag ?? '') ? activeTag : null

  const filteredEntries = useMemo(() => {
    if (!effectiveTag) return entries
    return entries.filter((entry) => entry.tag === effectiveTag)
  }, [entries, effectiveTag])

  return {
    activeTag: effectiveTag,
    setActiveTag,
    availableTags,
    filteredEntries,
  }
}
