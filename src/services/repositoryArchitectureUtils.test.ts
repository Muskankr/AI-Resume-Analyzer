import {
  evaluateRepositoryArchitecture,
  calculateRepositoryModularityIndex,
} from './repositoryArchitectureUtils';

describe('RepositoryArchitectureUtils', () => {
  it('evaluates layered architecture correctly', () => {
    const files = [
      'src/components/Header.tsx',
      'src/components/Footer.tsx',
      'src/services/candidatePortfolioVerificationService.ts',
      'src/services/portfolioScoringService.ts',
      'src/controllers/apiController.ts',
      'src/utils/formatters.ts',
    ];

    const result = evaluateRepositoryArchitecture('repo-architecture-1', files);

    expect(result.repositoryId).toBe('repo-architecture-1');
    expect(result.architectureQualityTier).toBe('EXEMPLARY_ARCHITECTURE');
    expect(result.detectedPatterns).toContain('Layered Architecture');
    expect(result.detectedPatterns).toContain('MVC / API Gateway Controller Pattern');
    expect(result.architecturalViolations.length).toBe(0);
  });

  it('detects unorganized root directory violations', () => {
    const files = [
      'app1.js',
      'app2.js',
      'app3.js',
      'app4.js',
      'app5.js',
      'app6.js',
      'app7.js',
      'app8.js',
      'app9.js',
      'app10.js',
      'app11.js',
      'app12.js',
      'app13.js',
      'app14.js',
      'app15.js',
      'app16.js',
    ];

    const result = evaluateRepositoryArchitecture('repo-unstructured', files);

    expect(result.architectureQualityTier).toBe('UNSTRUCTURED');
    expect(result.architecturalViolations).toContain('Root directory cluttered with too many unstructured source files.');
  });

  it('calculates modularity index accurately based on folder file counts', () => {
    const balancedFolders = {
      services: 5,
      components: 6,
      controllers: 4,
      utils: 5,
    };

    const index = calculateRepositoryModularityIndex(balancedFolders);
    expect(index).toBeGreaterThanOrEqual(80);

    const empty = calculateRepositoryModularityIndex({});
    expect(empty).toBe(0);
  });
});
