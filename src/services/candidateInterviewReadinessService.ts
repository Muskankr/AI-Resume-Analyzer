/**
 * AI Candidate Interview Readiness & Technical Question Generator Service
 * Analyzes candidate resume skills, open-source projects, and career experience
 * to generate role-tailored technical interview questions, system design prompts, and behavioral STAR scenarios.
 */

export interface CandidateProfileInput {
  candidateId: string;
  targetRole: string;
  experienceLevel: 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF_ARCHITECT';
  primaryLanguages: string[];
  frameworks: string[];
  databases: string[];
  cloudPlatforms: string[];
  projectsSummary: Array<{
    projectName: string;
    description: string;
    techStack: string[];
  }>;
}

export interface TechnicalQuestionPrompt {
  questionId: string;
  category: 'SYSTEM_DESIGN' | 'ALGORITHMS_DATA_STRUCTURES' | 'FRAMEWORK_DEEP_DIVE' | 'BEHAVIORAL_STAR';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  questionText: string;
  expectedKeyConcepts: string[];
  sampleModelAnswer: string;
}

export interface InterviewReadinessAssessment {
  candidateId: string;
  targetRole: string;
  readinessScore: number; // 0 - 100
  readinessTier: 'EXCEPTIONAL_PREPARATION' | 'SOLID_CANDIDATE' | 'NEEDS_PREPARATION' | 'UNPREPARED';
  generatedQuestions: TechnicalQuestionPrompt[];
  focusAreas: string[];
  recommendedPreparationHours: number;
  evaluatedAt: string;
}

/**
 * Generates tailored interview questions and evaluates overall candidate interview readiness.
 */
export function generateInterviewReadinessAssessment(
  profile: CandidateProfileInput
): InterviewReadinessAssessment {
  const questions: TechnicalQuestionPrompt[] = [];
  const focusAreas: string[] = [];

  // Generate System Design Prompts
  if (profile.experienceLevel === 'SENIOR' || profile.experienceLevel === 'STAFF_ARCHITECT') {
    questions.push({
      questionId: 'q-sysdesign-01',
      category: 'SYSTEM_DESIGN',
      difficulty: 'HARD',
      questionText: `Design a high-throughput, low-latency rate limiter and API gateway utilizing ${profile.cloudPlatforms[0] || 'AWS'} and ${profile.databases[0] || 'Redis'}.`,
      expectedKeyConcepts: ['Token Bucket / Leaky Bucket Algorithm', 'Distributed Locking', 'Redis Cluster', 'Sliding Window Log'],
      sampleModelAnswer: 'Use Redis with Lua scripts to atomically check and update token counts per client IP/API key.',
    });
  }

  // Framework & Tech Stack Deep Dives
  for (const fw of profile.frameworks) {
    if (fw.toLowerCase() === 'react') {
      questions.push({
        questionId: 'q-react-01',
        category: 'FRAMEWORK_DEEP_DIVE',
        difficulty: profile.experienceLevel === 'SENIOR' ? 'HARD' : 'MEDIUM',
        questionText: 'Explain how React Concurrent Mode, Server Components (RSC), and Fiber reconciliation optimize render performance.',
        expectedKeyConcepts: ['React Fiber', 'Work Loop', 'Suspense Boundary', 'Server vs Client Components'],
        sampleModelAnswer: 'React Fiber splits rendering work into chunks, prioritizing urgent user inputs over background updates.',
      });
    } else if (fw.toLowerCase() === 'node.js' || fw.toLowerCase() === 'express') {
      questions.push({
        questionId: 'q-node-01',
        category: 'FRAMEWORK_DEEP_DIVE',
        difficulty: 'MEDIUM',
        questionText: 'Describe the Node.js Event Loop phases, libuv thread pool execution, and non-blocking I/O operations.',
        expectedKeyConcepts: ['Event Loop Phases', 'Timers', 'Poll', 'Check', 'Microtask Queue', 'libuv Thread Pool'],
        sampleModelAnswer: 'The Event Loop executes JS callbacks asynchronously using libuv to handle OS-level non-blocking sockets.',
      });
    }
  }

  // Behavioral STAR Scenario
  questions.push({
    questionId: 'q-behavioral-01',
    category: 'BEHAVIORAL_STAR',
    difficulty: 'MEDIUM',
    questionText: `Describe a scenario where you had to refactor or fix a critical production bottleneck in ${profile.projectsSummary[0]?.projectName || 'a core system'}.`,
    expectedKeyConcepts: ['Situation', 'Task', 'Action', 'Result', 'Quantifiable Metrics'],
    sampleModelAnswer: 'Identified database index bottleneck using profiling tools, reduced execution time by 60%, improving throughput.',
  });

  // Calculate Readiness Score
  const langScore = Math.min(30, profile.primaryLanguages.length * 10);
  const fwScore = Math.min(30, profile.frameworks.length * 10);
  const projScore = Math.min(40, profile.projectsSummary.length * 15);

  const readinessScore = Math.min(100, langScore + fwScore + projScore);

  let tier: InterviewReadinessAssessment['readinessTier'] = 'SOLID_CANDIDATE';
  if (readinessScore >= 85) tier = 'EXCEPTIONAL_PREPARATION';
  else if (readinessScore >= 65) tier = 'SOLID_CANDIDATE';
  else if (readinessScore >= 45) tier = 'NEEDS_PREPARATION';
  else tier = 'UNPREPARED';

  if (profile.databases.length === 0) {
    focusAreas.push('Brush up on SQL/NoSQL database modeling and query optimization.');
  }
  if (profile.cloudPlatforms.length === 0) {
    focusAreas.push('Gain familiarity with cloud deployment pipelines (AWS/GCP/Docker).');
  }

  const prepHours = Math.max(5, Math.round((100 - readinessScore) * 0.4));

  return {
    candidateId: profile.candidateId,
    targetRole: profile.targetRole,
    readinessScore,
    readinessTier: tier,
    generatedQuestions: questions,
    focusAreas,
    recommendedPreparationHours: prepHours,
    evaluatedAt: new Date().toISOString(),
  };
}
