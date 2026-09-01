export interface ReleaseHighlight {
  title: string
  description: string
  tag: 'New' | 'Improved' | 'Security' | 'Fix'
  icon?: string
}

export interface ReleaseInfo {
  version: string
  title: string
  date: string
  highlights: ReleaseHighlight[]
}

export const CURRENT_RELEASE: ReleaseInfo = {
  version: '2.4.0',
  title: "What's New in AI Resume Analyzer",
  date: 'August 2026',
  highlights: [
    {
      title: 'Opt-in Resume Roast Feedback',
      description:
        'Get humorously constructive, spicy feedback on your resume suggestions with our new Roast Mode toggle.',
      tag: 'New',
      icon: '🔥',
    },
    {
      title: 'Action Plan & Checklist Export',
      description:
        'Export a prioritized, ATS-impact-ranked improvement plan in clean Markdown or PDF format.',
      tag: 'New',
      icon: '📋',
    },
    {
      title: 'Multi-Resume ZIP Export',
      description:
        'Download multiple comparative resume and job description analyses simultaneously in a single structured ZIP archive.',
      tag: 'New',
      icon: '📦',
    },
    {
      title: 'Weekly Resume Tips & Nudges',
      description:
        'Subscribe to curated weekly ATS tips and score-improvement nudges right from your account profile.',
      tag: 'Improved',
      icon: '📧',
    },
    {
      title: 'Terms of Service & Privacy Policy',
      description:
        'Full legal transparency and immediate document deletion standards available directly in the footer.',
      tag: 'Improved',
      icon: '🔒',
    },
  ],
}

export const WHATS_NEW_STORAGE_KEY = 'whats_new_last_seen_version'

export function shouldShowWhatsNew(currentVersion = CURRENT_RELEASE.version): boolean {
  try {
    const lastSeen = localStorage.getItem(WHATS_NEW_STORAGE_KEY)
    return lastSeen !== currentVersion
  } catch {
    return false
  }
}

export function markWhatsNewAsSeen(version = CURRENT_RELEASE.version): void {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, version)
  } catch {
    // ignore
  }
}
