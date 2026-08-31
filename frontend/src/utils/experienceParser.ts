export type ExperienceLevel = 'Junior' | 'Mid' | 'Senior' | 'Lead';

interface ParsedExperience {
  estimatedYears: number;
  suggestedLevel: ExperienceLevel;
}

/**
 * Parses raw text chunks for date patterns and calculates cumulative experience.
 */
export function estimateExperienceFromText(resumeText: string): ParsedExperience {
  // Regex matching common resume date formats: Month YYYY or MM/YYYY
  const dateRangeRegex = /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2})[\s,.\/]*\d{4}\s*[-––—至\s]+\s*(?:Present|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2})[\s,.\/]*\d{4})/gi;
  
  const matches = resumeText.match(dateRangeRegex) || [];
  let totalMonths = 0;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  matches.forEach(range => {
    try {
      // Normalise splitters to locate start and end date text segments
      const parts = range.split(/[-––—至]+/);
      if (parts.length !== 2) return;

      const start = parseDateString(parts[0].trim(), currentYear, currentMonth);
      const end = parseDateString(parts[1].trim(), currentYear, currentMonth);

      if (start && end && end >= start) {
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += diffMonths;
      }
    } catch (e) {
      // Log extraction abnormalities safely
      console.warn('[EXP_PARSER_MATCH_SKIP]:', e);
    }
  });

  // Fallback to a modest baseline if parsing structural gaps yield 0 months on long text
  let estimatedYears = Math.round((totalMonths / 12) * 10) / 10;
  if (estimatedYears === 0 && resumeText.length > 1500) {
    estimatedYears = 1.5; // Context baseline adjustment
  }

  // Map estimated timelines to target platform seniority levels (#758 reference)
  let suggestedLevel: ExperienceLevel = 'Junior';
  if (estimatedYears >= 8) suggestedLevel = 'Lead';
  else if (estimatedYears >= 5) suggestedLevel = 'Senior';
  else if (estimatedYears >= 2) suggestedLevel = 'Mid';

  return { estimatedYears, suggestedLevel };
}

function parseDateString(dateStr: string, currentYear: number, currentMonth: number): Date | null {
  if (/present/i.test(dateStr)) {
    return new Date(currentYear, currentMonth);
  }
  const dateParsed = Date.parse(dateStr);
  if (!isNaN(dateParsed)) {
    return new Date(dateParsed);
  }
  // Custom parsing fallback for short structural matches
  const monthMap: Record<string, number> = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const cleaned = dateStr.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  
  let year = currentYear;
  let month = 0;

  tokens.forEach(token => {
    if (/^\d{4}$/.test(token)) year = parseInt(token, 10);
    else if (token.slice(0, 3) in monthMap) month = monthMap[token.slice(0, 3)];
    else if (/^\d{1,2}$/.test(token)) {
      const m = parseInt(token, 10);
      if (m >= 1 && m <= 12) month = m - 1;
    }
  });

  return new Date(year, month);
}
