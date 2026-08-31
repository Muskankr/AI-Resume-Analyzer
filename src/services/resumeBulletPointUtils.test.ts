import { evaluateResumeBulletPoints } from './resumeBulletPointUtils';

describe('ResumeBulletPointUtils', () => {
  it('evaluates strong action verbs and quantified metrics in bullet points', () => {
    const bullets = [
      'Architected distributed microservices API reducing latency by 45%.',
      'Spearheaded frontend migration to React & TypeScript for 100k active users.',
      'Optimized database queries decreasing page load times from 2s to 400ms.',
    ];

    const result = evaluateResumeBulletPoints(bullets);

    expect(result.totalBulletPoints).toBe(3);
    expect(result.strongActionVerbsCount).toBe(3);
    expect(result.quantifiedAchievementsCount).toBe(3);
    expect(result.weakPassivePhrasesCount).toBe(0);
    expect(result.overallImpactScore).toBe(100);
  });

  it('flags weak passive phrasing and missing metrics', () => {
    const bullets = [
      'Worked on backend APIs.',
      'Responsible for bug fixing in legacy application.',
    ];

    const result = evaluateResumeBulletPoints(bullets);

    expect(result.totalBulletPoints).toBe(2);
    expect(result.weakPassivePhrasesCount).toBe(2);
    expect(result.overallImpactScore).toBeLessThan(50);
    expect(result.bulletPointFeedback[0].suggestion).toBeDefined();
  });
});
