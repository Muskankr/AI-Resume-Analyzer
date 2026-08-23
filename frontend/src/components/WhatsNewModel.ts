/**
 * Enterprise What's New Changelog Modal Model & Types
 * 
 * Architectural Specifications:
 * - LocalStorage version tracking (`whats_new_last_seen_version`).
 * - Release highlights data structure: Version, Release Date, Title, Features, Badges.
 * - Supports keyboard escape dismissal, backdrop click dismissal, and footer manual trigger.
 *
 * @module WhatsNewModel
 * @version 2.5.0
 * @author Enterprise AI Resume Architecture Team
 */

export interface ReleaseFeatureItem {
  id: string;
  category: 'FEATURE' | 'ENHANCEMENT' | 'SECURITY' | 'UI_UX';
  title: string;
  description: string;
  icon: string;
}

export interface ReleaseHighlight {
  version: string;
  releaseDate: string;
  tagline: string;
  badge: string;
  features: ReleaseFeatureItem[];
}

export const LATEST_RELEASE_HIGHLIGHTS: ReleaseHighlight = {
  version: '2.5.0',
  releaseDate: 'August 2026',
  tagline: 'Major Update: Resume Roast Mode, Multi-Resume Export & Architectural Analytics',
  badge: '✨ Release v2.5.0',
  features: [
    {
      id: 'f1',
      category: 'FEATURE',
      title: 'AI Resume Roast Mode & Brutal Feedback',
      description: 'Get funny, brutally honest AI-driven feedback on your resume structure and wording to fix glaring mistakes fast.',
      icon: '🔥'
    },
    {
      id: 'f2',
      category: 'ENHANCEMENT',
      title: 'Action Plan Export (PDF & Markdown)',
      description: 'Export personalized step-by-step career improvement roadmaps directly to PDF or structured Markdown files.',
      icon: '📄'
    },
    {
      id: 'f3',
      category: 'FEATURE',
      title: 'Multi-Resume ZIP Archive Export',
      description: 'Bulk download all your analyzed resume versions, ATS score reports, and diff logs in a single compressed ZIP archive.',
      icon: '📦'
    },
    {
      id: 'f4',
      category: 'UI_UX',
      title: 'Weekly Resume Improvement Tips Digest',
      description: 'Subscribe to curated weekly AI tips tailored specifically to your target industry and job level.',
      icon: '💡'
    },
    {
      id: 'f5',
      category: 'SECURITY',
      title: 'Enhanced Legal Terms & Consent Vault',
      description: 'Transparent explicit legal terms consent and GDPR zero-retention privacy controls on all document scans.',
      icon: '🛡️'
    }
  ]
};

export class WhatsNewVersionState {
  private static readonly STORAGE_KEY = 'whats_new_last_seen_version';

  public static getLastSeenVersion(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  public static markCurrentVersionSeen(version: string = LATEST_RELEASE_HIGHLIGHTS.version): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, version);
    } catch {
      // Ignore storage errors in sandbox
    }
  }

  public static shouldShowModal(currentVersion: string = LATEST_RELEASE_HIGHLIGHTS.version): boolean {
    const lastSeen = this.getLastSeenVersion();
    return lastSeen !== currentVersion;
  }
}
