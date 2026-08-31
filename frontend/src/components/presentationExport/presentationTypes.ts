// Resume Presentation & Export Manager — Type Definitions

export type TemplateStyle = 'MODERN' | 'CLASSIC' | 'MINIMAL' | 'CREATIVE' | 'EXECUTIVE' | 'TECHNICAL';

export type ExportFormat = 'PDF' | 'DOCX' | 'TXT' | 'HTML' | 'JSON' | 'LATEX';

export type ColorScheme = 'PROFESSIONAL' | 'BOLD' | 'SUBTLE' | 'TECH_BLUE' | 'EARTH_TONES' | 'MONOCHROME' | 'CUSTOM';

export type FontFamily = 'INTER' | 'ROBOTO' | 'LATO' | 'CALIBRI' | 'GEORGIA' | 'FIRA_CODE' | 'MERRIWEATHER';

export type LayoutStyle = 'SINGLE_COLUMN' | 'TWO_COLUMN' | 'SIDEBAR' | 'COMPACT' | 'TIMELINE';

export type SectionVisibility = 'VISIBLE' | 'HIDDEN' | 'CONDENSED';

export type ExportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type OptimizationLevel = 'NONE' | 'BASIC' | 'ATS_OPTIMIZED' | 'EXECUTIVE_POLISH';

export interface ResumeTemplate {
  templateId: string;
  name: string;
  description: string;
  style: TemplateStyle;
  layout: LayoutStyle;
  colorScheme: ColorScheme;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  sectionSpacing: number;
  showPhoto: boolean;
  showIcons: boolean;
  showDividers: boolean;
  previewUrl: string;
  popularity: number;
  isPremium: boolean;
  tags: string[];
}

export interface ResumeSectionConfig {
  sectionId: string;
  name: string;
  visibility: SectionVisibility;
  order: number;
  maxLines: number;
  showTitle: boolean;
  titleStyle: 'UNDERLINED' | 'BOLD' | 'CAPS' | 'NONE';
  customTitle?: string;
}

export interface ExportJob {
  jobId: string;
  templateId: string;
  format: ExportFormat;
  status: ExportStatus;
  optimizationLevel: OptimizationLevel;
  fileSizeKb?: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
}

export interface PresentationScore {
  aspect: string;
  score: number;
  maxScore: number;
  tips: string[];
}

export interface ResumeAnalytics {
  totalExports: number;
  formatBreakdown: Record<ExportFormat, number>;
  templateUsage: Record<string, number>;
  avgFileSize: number;
  avgPageCount: number;
  avgWordCount: number;
  lastExportDate: string;
  optimizationHistory: { date: string; score: number }[];
}

export interface SectionOptimization {
  sectionName: string;
  currentWordCount: number;
  recommendedWordCount: number;
  readabilityScore: number;
  impactScore: number;
  suggestions: string[];
}

export interface DesignElement {
  elementId: string;
  type: 'HEADER_STYLE' | 'SKILL_BARS' | 'TIMELINE' | 'ICON_SET' | 'DIVIDER' | 'BADGE' | 'QR_CODE' | 'FOOTER';
  name: string;
  description: string;
  previewIcon: string;
  isEnabled: boolean;
  premiumOnly: boolean;
}

export interface PresentationAuditLog {
  logId: string;
  timestamp: string;
  action: 'TEMPLATE_SELECTED' | 'EXPORT_GENERATED' | 'SECTION_reordered' | 'COLOR_CHANGED' | 'OPTIMIZATION_APPLIED' | 'DESIGN_ELEMENT_TOGGLED';
  details: string;
  performer: string;
}

// Color maps
export const STYLE_COLORS: Record<TemplateStyle, string> = {
  MODERN: '#6366f1', CLASSIC: '#6b7280', MINIMAL: '#22c55e', CREATIVE: '#ec4899',
  EXECUTIVE: '#f59e0b', TECHNICAL: '#06b6d4'
};

export const FORMAT_COLORS: Record<ExportFormat, string> = {
  PDF: '#ef4444', DOCX: '#3b82f6', TXT: '#6b7280', HTML: '#f59e0b', JSON: '#22c55e', LATEX: '#8b5cf6'
};

export const LAYOUT_ICONS: Record<LayoutStyle, string> = {
  SINGLE_COLUMN: '📄', TWO_COLUMN: '📊', SIDEBAR: '📐', COMPACT: '📋', TIMELINE: '📅'
};

export const STYLE_ICONS: Record<TemplateStyle, string> = {
  MODERN: '✨', CLASSIC: '📜', MINIMAL: '⬜', CREATIVE: '🎨', EXECUTIVE: '👔', TECHNICAL: '⚙️'
};

export const STATUS_COLORS: Record<ExportStatus, string> = {
  QUEUED: '#f59e0b', PROCESSING: '#3b82f6', COMPLETED: '#22c55e', FAILED: '#ef4444'
};

export const SCHEME_COLORS: Record<ColorScheme, string> = {
  PROFESSIONAL: '#1e40af', BOLD: '#dc2626', SUBTLE: '#6b7280', TECH_BLUE: '#0284c7',
  EARTH_TONES: '#92400e', MONOCHROME: '#171717', CUSTOM: '#8b5cf6'
};

// Formatters
export const formatFileSize = (kb: number): string =>
  kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

export const formatScore = (score: number): string => `${Math.round(score)}%`;

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
};
