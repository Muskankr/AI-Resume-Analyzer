/**
 * Utility functions to transform raw semantic diff data into readable, 
 * formatted UI elements and summary statistics.
 */

export interface SemanticChange {
    category: string;
    change_type: string;
    description: string;
    details: Record<string, any>;
}

export interface DiffSummary {
    skills_added: number;
    skills_removed: number;
    experience_expanded: number;
    experience_reduced: number;
    phrasing_improved: number;
    general_modifications: number;
}

export interface DiffData {
    changes: SemanticChange[];
    summary: DiffSummary;
    word_count_v1: number;
    word_count_v2: number;
}

/**
 * Calculates the net change in word count.
 */
export const getNetWordChange = (v1: number, v2: number): number => {
    return v2 - v1;
};

/**
 * Returns a Bootstrap color class based on the change type.
 */
export const getChangeColorClass = (changeType: string): string => {
    switch (changeType) {
        case 'added':
        case 'improved':
            return 'text-success';
        case 'removed':
            return 'text-danger';
        case 'modified':
            return 'text-warning';
        default:
            return 'text-secondary';
    }
};

/**
 * Returns a Bootstrap background class for badges based on category.
 */
export const getCategoryBadgeClass = (category: string): string => {
    switch (category) {
        case 'skill': return 'bg-primary';
        case 'experience': return 'bg-info text-dark';
        case 'education': return 'bg-secondary';
        case 'formatting': return 'bg-success';
        case 'general': return 'bg-dark border border-secondary';
        default: return 'bg-light text-dark';
    }
};

/**
 * Formats the summary into a list of high-level stat strings for the dashboard.
 */
export const formatSummaryStats = (summary: DiffSummary): string[] => {
    const stats: string[] = [];

    if (summary.skills_added > 0) stats.push(`+${summary.skills_added} Skills Added`);
    if (summary.skills_removed > 0) stats.push(`-${summary.skills_removed} Skills Removed`);
    if (summary.experience_expanded > 0) stats.push(`Experience Expanded`);
    if (summary.experience_reduced > 0) stats.push(`Experience Reduced`);
    if (summary.phrasing_improved > 0) stats.push(`Phrasing Improved`);
    if (summary.general_modifications > 0) stats.push(`General Text Modified`);

    return stats.length > 0 ? stats : ['No significant semantic changes detected'];
};

/**
 * Groups changes by their category for organized display.
 */
export const groupChangesByCategory = (changes: SemanticChange[]): Record<string, SemanticChange[]> => {
    return changes.reduce((acc, change) => {
        if (!acc[change.category]) {
            acc[change.category] = [];
        }
        acc[change.category].push(change);
        return acc;
    }, {} as Record<string, SemanticChange[]>);
};
