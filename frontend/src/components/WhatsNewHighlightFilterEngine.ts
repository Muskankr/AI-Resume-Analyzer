/**
 * What's New Release Highlights Data Provider & Extension Helpers
 */

import { LATEST_RELEASE_HIGHLIGHTS, type ReleaseFeatureItem } from './WhatsNewModel';

export interface ReleaseFilter {
  category?: string;
  query?: string;
}

export class WhatsNewHighlightFilterEngine {
  public static filterFeatures(query: string = ''): ReleaseFeatureItem[] {
    if (!query) return LATEST_RELEASE_HIGHLIGHTS.features;
    
    return LATEST_RELEASE_HIGHLIGHTS.features.filter((f: any) =>
      f.title.toLowerCase().includes(query.toLowerCase()) ||
      f.description.toLowerCase().includes(query.toLowerCase())
    );
  }
}
