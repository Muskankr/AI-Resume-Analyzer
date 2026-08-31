/**
 * Dedicated frontend API client for managing bullet point optimization requests,
 * caching local drafts, and handling loading/error states.
 */
import { api } from '../api/client';

export interface StarComponent {
    situation: string | null;
    task: string | null;
    action: string | null;
    result: string | null;
}

export interface BulletAnalysisResult {
    original: string;
    has_action_verb: boolean;
    has_metric: boolean;
    is_passive: boolean;
    star_components: StarComponent;
    score: number;
    suggestions: string[];
    rewrites: string[];
}

export interface OptimizationResponse {
    results: BulletAnalysisResult[];
    average_score: number;
    total_processed: number;
}

export const optimizeBullets = async (
    bullets: string[],
    targetRole?: string,
    jobDescription?: string
): Promise<OptimizationResponse> => {
    const payload = {
        bullets,
        ...(targetRole && { target_role: targetRole }),
        ...(jobDescription && { job_description: jobDescription }),
    };

    const response = await api.post<OptimizationResponse>('/api/analyzer/optimize-bullets/', payload);
    return response.data;
};

export const saveDraftToLocal = (bulletIndex: number, original: string, rewrite: string) => {
    const drafts = JSON.parse(localStorage.getItem('bullet_drafts') || '{}');
    drafts[bulletIndex] = { original, rewrite, timestamp: Date.now() };
    localStorage.setItem('bullet_drafts', JSON.stringify(drafts));
};

export const getDraftFromLocal = (bulletIndex: number) => {
    const drafts = JSON.parse(localStorage.getItem('bullet_drafts') || '{}');
    return drafts[bulletIndex] || null;
};
