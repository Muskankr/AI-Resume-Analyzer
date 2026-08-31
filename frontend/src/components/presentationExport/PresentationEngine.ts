import type {
  ResumeTemplate, ResumeSectionConfig, ExportJob, PresentationScore,
  ResumeAnalytics, SectionOptimization, DesignElement, PresentationAuditLog
} from './presentationTypes';

export function getTemplates(): ResumeTemplate[] {
  return [
    { templateId: 't1', name: 'Modern Pro', description: 'Clean, modern layout with accent colors and subtle icons. Perfect for tech roles.', style: 'MODERN', layout: 'TWO_COLUMN', colorScheme: 'TECH_BLUE', primaryColor: '#0284c7', secondaryColor: '#e0f2fe', fontFamily: 'INTER', fontSize: 11, lineHeight: 1.5, sectionSpacing: 16, showPhoto: false, showIcons: true, showDividers: true, previewUrl: '#', popularity: 92, isPremium: false, tags: ['tech', 'clean', 'ats-friendly'] },
    { templateId: 't2', name: 'Classic Elegance', description: 'Traditional single-column layout with serif fonts. Ideal for finance and legal roles.', style: 'CLASSIC', layout: 'SINGLE_COLUMN', colorScheme: 'PROFESSIONAL', primaryColor: '#1e40af', secondaryColor: '#dbeafe', fontFamily: 'GEORGIA', fontSize: 11, lineHeight: 1.6, sectionSpacing: 18, showPhoto: false, showIcons: false, showDividers: true, previewUrl: '#', popularity: 85, isPremium: false, tags: ['traditional', 'professional', 'finance'] },
    { templateId: 't3', name: 'Minimal Focus', description: 'Ultra-clean minimal design. Lets your content speak for itself.', style: 'MINIMAL', layout: 'SINGLE_COLUMN', colorScheme: 'SUBTLE', primaryColor: '#374151', secondaryColor: '#f9fafb', fontFamily: 'LATO', fontSize: 10.5, lineHeight: 1.5, sectionSpacing: 14, showPhoto: false, showIcons: false, showDividers: false, previewUrl: '#', popularity: 78, isPremium: false, tags: ['minimal', 'clean', 'ats-friendly'] },
    { templateId: 't4', name: 'Creative Showcase', description: 'Bold design with vibrant colors. Perfect for design and marketing roles.', style: 'CREATIVE', layout: 'SIDEBAR', colorScheme: 'BOLD', primaryColor: '#dc2626', secondaryColor: '#fef2f2', fontFamily: 'ROBOTO', fontSize: 10.5, lineHeight: 1.4, sectionSpacing: 12, showPhoto: true, showIcons: true, showDividers: true, previewUrl: '#', popularity: 71, isPremium: true, tags: ['creative', 'bold', 'design'] },
    { templateId: 't5', name: 'Executive Suite', description: 'Polished executive layout with sophisticated typography. For C-level and VP roles.', style: 'EXECUTIVE', layout: 'TWO_COLUMN', colorScheme: 'EARTH_TONES', primaryColor: '#92400e', secondaryColor: '#fef3c7', fontFamily: 'MERRIWEATHER', fontSize: 11, lineHeight: 1.6, sectionSpacing: 20, showPhoto: true, showIcons: false, showDividers: true, previewUrl: '#', popularity: 88, isPremium: true, tags: ['executive', 'senior', 'leadership'] },
    { templateId: 't6', name: 'Tech Stack', description: 'Developer-focused with monospace accents, skill bars, and GitHub-style badges.', style: 'TECHNICAL', layout: 'TWO_COLUMN', colorScheme: 'TECH_BLUE', primaryColor: '#0891b2', secondaryColor: '#ecfeff', fontFamily: 'FIRA_CODE', fontSize: 10, lineHeight: 1.4, sectionSpacing: 12, showPhoto: false, showIcons: true, showDividers: true, previewUrl: '#', popularity: 95, isPremium: false, tags: ['developer', 'engineering', 'tech'] },
    { templateId: 't7', name: 'Timeline Pro', description: 'Visual timeline layout showing career progression. Great for experienced professionals.', style: 'MODERN', layout: 'TIMELINE', colorScheme: 'PROFESSIONAL', primaryColor: '#4f46e5', secondaryColor: '#eef2ff', fontFamily: 'INTER', fontSize: 10.5, lineHeight: 1.5, sectionSpacing: 14, showPhoto: false, showIcons: true, showDividers: false, previewUrl: '#', popularity: 82, isPremium: true, tags: ['timeline', 'experience', 'progression'] },
  ];
}

export function getSectionConfigs(): ResumeSectionConfig[] {
  return [
    { sectionId: 's1', name: 'HEADER', visibility: 'VISIBLE', order: 1, maxLines: 3, showTitle: false, titleStyle: 'NONE' },
    { sectionId: 's2', name: 'SUMMARY', visibility: 'VISIBLE', order: 2, maxLines: 4, showTitle: true, titleStyle: 'CAPS', customTitle: 'Professional Summary' },
    { sectionId: 's3', name: 'EXPERIENCE', visibility: 'VISIBLE', order: 3, maxLines: 20, showTitle: true, titleStyle: 'CAPS', customTitle: 'Work Experience' },
    { sectionId: 's4', name: 'SKILLS', visibility: 'VISIBLE', order: 4, maxLines: 8, showTitle: true, titleStyle: 'CAPS', customTitle: 'Technical Skills' },
    { sectionId: 's5', name: 'EDUCATION', visibility: 'VISIBLE', order: 5, maxLines: 6, showTitle: true, titleStyle: 'CAPS', customTitle: 'Education' },
    { sectionId: 's6', name: 'PROJECTS', visibility: 'VISIBLE', order: 6, maxLines: 10, showTitle: true, titleStyle: 'CAPS', customTitle: 'Projects' },
    { sectionId: 's7', name: 'CERTIFICATIONS', visibility: 'CONDENSED', order: 7, maxLines: 4, showTitle: true, titleStyle: 'CAPS', customTitle: 'Certifications' },
    { sectionId: 's8', name: 'AWARDS', visibility: 'HIDDEN', order: 8, maxLines: 4, showTitle: true, titleStyle: 'CAPS', customTitle: 'Awards & Recognition' },
  ];
}

export function getExportJobs(): ExportJob[] {
  return [
    { jobId: 'ej1', templateId: 't6', format: 'PDF', status: 'COMPLETED', optimizationLevel: 'ATS_OPTIMIZED', fileSizeKb: 245, downloadUrl: '#', createdAt: '2026-08-24T10:00:00Z', completedAt: '2026-08-24T10:02:00Z', fileName: 'resume_tech_stack_v3.pdf', pageCount: 1, wordCount: 487 },
    { jobId: 'ej2', templateId: 't1', format: 'PDF', status: 'COMPLETED', optimizationLevel: 'BASIC', fileSizeKb: 312, downloadUrl: '#', createdAt: '2026-08-23T14:00:00Z', completedAt: '2026-08-23T14:01:30Z', fileName: 'resume_modern_pro_v2.pdf', pageCount: 1, wordCount: 520 },
    { jobId: 'ej3', templateId: 't2', format: 'DOCX', status: 'COMPLETED', optimizationLevel: 'NONE', fileSizeKb: 189, downloadUrl: '#', createdAt: '2026-08-22T09:00:00Z', completedAt: '2026-08-22T09:01:00Z', fileName: 'resume_classic_v1.docx', pageCount: 1, wordCount: 487 },
    { jobId: 'ej4', templateId: 't6', format: 'LATEX', status: 'COMPLETED', optimizationLevel: 'ATS_OPTIMIZED', fileSizeKb: 15, downloadUrl: '#', createdAt: '2026-08-21T16:00:00Z', completedAt: '2026-08-21T16:00:45Z', fileName: 'resume_tech_stack.tex', pageCount: 1, wordCount: 487 },
    { jobId: 'ej5', templateId: 't5', format: 'PDF', status: 'PROCESSING', optimizationLevel: 'EXECUTIVE_POLISH', createdAt: '2026-08-24T14:30:00Z', fileName: 'resume_executive_v1.pdf', pageCount: 2, wordCount: 680 },
    { jobId: 'ej6', templateId: 't3', format: 'HTML', status: 'QUEUED', optimizationLevel: 'NONE', createdAt: '2026-08-24T14:35:00Z', fileName: 'resume_minimal_v1.html', pageCount: 1, wordCount: 487 },
  ];
}

export function getPresentationScores(): PresentationScore[] {
  return [
    { aspect: 'Visual Appeal', score: 85, maxScore: 100, tips: ['Consider adding subtle color accents', 'Consistent font sizing looks great'] },
    { aspect: 'Readability', score: 90, maxScore: 100, tips: ['Good use of white space', 'Section headers are clear'] },
    { aspect: 'ATS Compatibility', score: 78, maxScore: 100, tips: ['Avoid tables for layout', 'Use standard section headings'] },
    { aspect: 'Content Density', score: 82, maxScore: 100, tips: ['Experience section could be tighter', 'Skills section is well-organized'] },
    { aspect: 'Professional Impact', score: 88, maxScore: 100, tips: ['Strong quantified achievements', 'Good variety of action verbs'] },
  ];
}

export function getResumeAnalytics(): ResumeAnalytics {
  return {
    totalExports: 47,
    formatBreakdown: { PDF: 35, DOCX: 6, TXT: 2, HTML: 1, JSON: 0, LATEX: 3 },
    templateUsage: { 'Tech Stack': 18, 'Modern Pro': 12, 'Classic Elegance': 8, 'Executive Suite': 5, 'Minimal Focus': 4 },
    avgFileSize: 265,
    avgPageCount: 1.2,
    avgWordCount: 498,
    lastExportDate: '2026-08-24T10:00:00Z',
    optimizationHistory: [
      { date: 'Mar', score: 65 }, { date: 'Apr', score: 70 }, { date: 'May', score: 74 },
      { date: 'Jun', score: 78 }, { date: 'Jul', score: 82 }, { date: 'Aug', score: 88 }
    ]
  };
}

export function getSectionOptimizations(): SectionOptimization[] {
  return [
    { sectionName: 'Summary', currentWordCount: 45, recommendedWordCount: 50, readabilityScore: 92, impactScore: 85, suggestions: ['Add target role mention', 'Include 1-2 quantified metrics'] },
    { sectionName: 'Experience', currentWordCount: 220, recommendedWordCount: 200, readabilityScore: 85, impactScore: 88, suggestions: ['Condense oldest role to 1 bullet', 'Front-load metrics in each bullet'] },
    { sectionName: 'Skills', currentWordCount: 60, recommendedWordCount: 55, readabilityScore: 95, impactScore: 78, suggestions: ['Group by proficiency level', 'Remove outdated skills'] },
    { sectionName: 'Education', currentWordCount: 35, recommendedWordCount: 30, readabilityScore: 90, impactScore: 70, suggestions: ['Remove GPA if >3 years out', 'Add relevant coursework if applicable'] },
    { sectionName: 'Projects', currentWordCount: 127, recommendedWordCount: 120, readabilityScore: 88, impactScore: 82, suggestions: ['Add tech stack to each project', 'Include GitHub/live links'] },
  ];
}

export function getDesignElements(): DesignElement[] {
  return [
    { elementId: 'de1', type: 'HEADER_STYLE', name: 'Header Style', description: 'Choose between name banner, centered header, or sidebar header', previewIcon: '📋', isEnabled: true, premiumOnly: false },
    { elementId: 'de2', type: 'SKILL_BARS', name: 'Skill Bars', description: 'Visual progress bars showing proficiency levels', previewIcon: '📊', isEnabled: true, premiumOnly: false },
    { elementId: 'de3', type: 'TIMELINE', name: 'Timeline Layout', description: 'Visual timeline showing career progression', previewIcon: '📅', isEnabled: false, premiumOnly: true },
    { elementId: 'de4', type: 'ICON_SET', name: 'Icon Pack', description: 'Category icons for contact info and section headers', previewIcon: '🎯', isEnabled: true, premiumOnly: false },
    { elementId: 'de5', type: 'DIVIDER', name: 'Section Dividers', description: 'Decorative lines between resume sections', previewIcon: '➖', isEnabled: true, premiumOnly: false },
    { elementId: 'de6', type: 'BADGE', name: 'Skill Badges', description: 'Colored badges for technology skills', previewIcon: '🏷️', isEnabled: false, premiumOnly: true },
    { elementId: 'de7', type: 'QR_CODE', name: 'QR Code', description: 'Link to your portfolio or LinkedIn via QR code', previewIcon: '📱', isEnabled: false, premiumOnly: true },
    { elementId: 'de8', type: 'FOOTER', name: 'Page Footer', description: 'Optional footer with page number and date', previewIcon: '📄', isEnabled: true, premiumOnly: false },
  ];
}

export function getAuditLogs(): PresentationAuditLog[] {
  return [
    { logId: 'pal1', timestamp: '2026-08-24T10:02:00Z', action: 'EXPORT_GENERATED', details: 'Exported "Tech Stack" template as ATS-optimized PDF (245KB)', performer: 'You' },
    { logId: 'pal2', timestamp: '2026-08-24T09:45:00Z', action: 'DESIGN_ELEMENT_TOGGLED', details: 'Enabled Skill Bars and Icon Pack on Tech Stack template', performer: 'You' },
    { logId: 'pal3', timestamp: '2026-08-23T14:00:00Z', action: 'EXPORT_GENERATED', details: 'Exported "Modern Pro" template as basic PDF (312KB)', performer: 'You' },
    { logId: 'pal4', timestamp: '2026-08-23T10:00:00Z', action: 'COLOR_CHANGED', details: 'Changed color scheme from PROFESSIONAL to TECH_BLUE', performer: 'You' },
    { logId: 'pal5', timestamp: '2026-08-22T09:00:00Z', action: 'TEMPLATE_SELECTED', details: 'Switched from Classic Elegance to Tech Stack template', performer: 'You' },
    { logId: 'pal6', timestamp: '2026-08-21T16:00:00Z', action: 'OPTIMIZATION_APPLIED', details: 'Applied ATS optimization — improved keyword density by 15%', performer: 'You' },
    { logId: 'pal7', timestamp: '2026-08-20T11:00:00Z', action: 'SECTION_reordered', details: 'Moved PROJECTS section above EDUCATION', performer: 'You' },
  ];
}

export function getMonthlyTrends() {
  return [
    { month: 'Mar', exports: 5, avgScore: 65, templates: 2 },
    { month: 'Apr', exports: 7, avgScore: 70, templates: 3 },
    { month: 'May', exports: 8, avgScore: 74, templates: 3 },
    { month: 'Jun', exports: 10, avgScore: 78, templates: 4 },
    { month: 'Jul', exports: 9, avgScore: 82, templates: 4 },
    { month: 'Aug', exports: 8, avgScore: 88, templates: 5 },
  ];
}
