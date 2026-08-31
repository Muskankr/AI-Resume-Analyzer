/**
 * Utility functions to calculate and aggregate layout scores based on backend metrics.
 */
export interface LayoutIssue {
    section: string;
    issue_type: string;
    severity: string;
    description: string;
    recommendation: string;
}

export interface LayoutAnalysisResult {
    score: number;
    issues: LayoutIssue[];
    detected_sections: string[];
    unique_font_sizes: number;
    total_lines: number;
}

export const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
        case 'high': return '#dc3545'; // Bootstrap danger
        case 'medium': return '#ffc107'; // Bootstrap warning
        case 'low': return '#0dcaf0'; // Bootstrap info
        default: return '#6c757d'; // Bootstrap secondary
    }
};

export const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
};

export const groupIssuesBySection = (issues: LayoutIssue[]): Record<string, LayoutIssue[]> => {
    return issues.reduce((acc, issue) => {
        if (!acc[issue.section]) {
            acc[issue.section] = [];
        }
        acc[issue.section].push(issue);
        return acc;
    }, {} as Record<string, LayoutIssue[]>);
};
