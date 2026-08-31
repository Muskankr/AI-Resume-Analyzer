export type SkillPriority = 'REQUIRED' | 'PREFERRED' | 'STANDARD';

export interface ClassifiedSkill {
  name: string;
  priority: SkillPriority;
  contextPhrase: string;
}

/**
 * Extracts and classifies skills from a Job Description text layer based on priority signals.
 */
export function parseAndClassifyJdSkills(jdText: string, masterSkillList: string[]): ClassifiedSkill[] {
  if (!jdText || jdText.trim().length === 0) return [];

  // 1. Define linguistic indicator blocks
  const requiredKeywords = /\b(required|must[\s-]have|essential|minimum|requirements|qualification|necessary|look for)\b/i;
  const preferredKeywords = /\b(preferred|nice[\s-]to[\s-]have|bonus|plus|desired|optional|advantage|helpful|asset)\b/i;

  // 2. Break down text blocks into clean lines or sentence structures
  const sentences = jdText.split(/[.!?;\n]+/).map(s => s.trim()).filter(Boolean);
  const classifiedSkillsMap = new Map<string, ClassifiedSkill>();

  // 3. Scan the text context for master skill occurrences
  masterSkillList.forEach(skill => {
    // Escape special characters to form a safe bounded regex match
    const skillRegex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');

    for (const sentence of sentences) {
      if (skillRegex.test(sentence)) {
        let priority: SkillPriority = 'STANDARD'; // Baseline default fallback

        if (requiredKeywords.test(sentence)) {
          priority = 'REQUIRED';
        } else if (preferredKeywords.test(sentence)) {
          priority = 'PREFERRED';
        }

        // If a skill appears multiple times, elevate its priority level iteratively
        const existing = classifiedSkillsMap.get(skill);
        if (!existing || (priority === 'REQUIRED' && existing.priority !== 'REQUIRED') || (priority === 'PREFERRED' && existing.priority === 'STANDARD')) {
          classifiedSkillsMap.set(skill, {
            name: skill,
            priority,
            contextPhrase: sentence.length > 80 ? `${sentence.slice(0, 77)}...` : sentence
          });
        }
      }
    }
  });

  return Array.from(classifiedSkillsMap.values());
}
