import { describe, it, expect } from 'vitest';
import { parseAndClassifyJdSkills } from './jdSkillParser';

describe('jdSkillParser', () => {
  const masterSkills = ['React', 'Python', 'Django', 'TypeScript', 'Docker', 'Kubernetes'];

  it('correctly classifies REQUIRED skills', () => {
    const jdText = 'We are hiring a developer with React. Python is required for this role. Django is a must-have.';
    const result = parseAndClassifyJdSkills(jdText, masterSkills);

    const react = result.find(s => s.name === 'React');
    const python = result.find(s => s.name === 'Python');
    const django = result.find(s => s.name === 'Django');

    expect(react?.priority).toBe('STANDARD'); // Default baseline fallback
    expect(python?.priority).toBe('REQUIRED');
    expect(django?.priority).toBe('REQUIRED');
  });

  it('correctly classifies PREFERRED skills', () => {
    const jdText = 'Docker is preferred. Knowledge of Kubernetes is nice-to-have. Experience with TypeScript is a plus.';
    const result = parseAndClassifyJdSkills(jdText, masterSkills);

    const docker = result.find(s => s.name === 'Docker');
    const kubernetes = result.find(s => s.name === 'Kubernetes');
    const typescript = result.find(s => s.name === 'TypeScript');

    expect(docker?.priority).toBe('PREFERRED');
    expect(kubernetes?.priority).toBe('PREFERRED');
    expect(typescript?.priority).toBe('PREFERRED');
  });

  it('elevates priority to REQUIRED if a skill appears multiple times with differing flags', () => {
    const jdText = 'Docker is nice-to-have. Actually, Docker is required for our infrastructure.';
    const result = parseAndClassifyJdSkills(jdText, masterSkills);

    const docker = result.find(s => s.name === 'Docker');
    expect(docker?.priority).toBe('REQUIRED');
  });

  it('returns empty array if job description is empty', () => {
    expect(parseAndClassifyJdSkills('', masterSkills)).toEqual([]);
  });
});
