/**
 * Repository Architecture Analysis & Design Pattern Audit Utility
 * Analyzes candidate repository folder structures, design pattern implementations, modularity index,
 * and architectural clean code compliance for engineering evaluation.
 */

export interface ArchitectureMetricRule {
  ruleId: string;
  ruleName: string;
  category: 'DESIGN_PATTERN' | 'MODULARITY' | 'DIRECTORY_STRUCTURE' | 'CLEAN_CODE';
  weight: number;
}

export interface ArchitectureAuditConfig {
  minimumModularityScore: number;
  requireCleanArchitecture: boolean;
  allowedDesignPatterns: string[];
}

export interface ArchitecturalEvaluationResult {
  repositoryId: string;
  modularityIndex: number; // 0 - 100
  architectureQualityTier: 'EXEMPLARY_ARCHITECTURE' | 'MODULAR_DESIGN' | 'MONOLITHIC_STRUCTURE' | 'UNSTRUCTURED';
  detectedPatterns: string[];
  architecturalViolations: string[];
  modularityScore: number;
}

export const DEFAULT_ARCHITECTURE_RULES: ArchitectureMetricRule[] = [
  { ruleId: 'ARCH-01', ruleName: 'Separation of Services & Presentation', category: 'DIRECTORY_STRUCTURE', weight: 25 },
  { ruleId: 'ARCH-02', ruleName: 'Dependency Inversion & Interfaces', category: 'DESIGN_PATTERN', weight: 25 },
  { ruleId: 'ARCH-03', ruleName: 'Component Modularity & Decoupling', category: 'MODULARITY', weight: 25 },
  { ruleId: 'ARCH-04', ruleName: 'Clean Code File Naming & Conventions', category: 'CLEAN_CODE', weight: 25 },
];

/**
 * Conducts architectural evaluation on repository file structure and pattern indicators.
 */
export function evaluateRepositoryArchitecture(
  repositoryId: string,
  filePaths: string[],
  config: ArchitectureAuditConfig = {
    minimumModularityScore: 70,
    requireCleanArchitecture: true,
    allowedDesignPatterns: ['MVC', 'Clean Architecture', 'Repository Pattern', 'Microservices'],
  }
): ArchitecturalEvaluationResult {
  const detectedPatterns: string[] = [];
  const violations: string[] = [];
  let score = 50;

  // Pattern detection based on directory paths
  const hasServices = filePaths.some((p) => p.includes('/services/') || p.includes('/service/'));
  const hasComponents = filePaths.some((p) => p.includes('/components/') || p.includes('/views/'));
  const hasControllers = filePaths.some((p) => p.includes('/controllers/') || p.includes('/api/'));
  const hasUtils = filePaths.some((p) => p.includes('/utils/') || p.includes('/helpers/'));

  if (hasServices && hasComponents) {
    detectedPatterns.push('Layered Architecture');
    score += 20;
  }
  if (hasControllers) {
    detectedPatterns.push('MVC / API Gateway Controller Pattern');
    score += 15;
  }
  if (hasUtils) {
    detectedPatterns.push('Modular Utility Abstraction');
    score += 15;
  }

  // File structure sanity checks
  const rootFilesCount = filePaths.filter((p) => !p.includes('/') || p.split('/').length === 1).length;
  if (rootFilesCount > 15) {
    violations.push('Root directory cluttered with too many unstructured source files.');
    score -= 15;
  }

  if (!hasServices && !hasControllers) {
    violations.push('Lack of explicit service or controller business logic abstraction layer.');
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  let tier: ArchitecturalEvaluationResult['architectureQualityTier'] = 'MODULAR_DESIGN';
  if (score >= 85) tier = 'EXEMPLARY_ARCHITECTURE';
  else if (score >= 65) tier = 'MODULAR_DESIGN';
  else if (score >= 45) tier = 'MONOLITHIC_STRUCTURE';
  else tier = 'UNSTRUCTURED';

  return {
    repositoryId,
    modularityIndex: score,
    architectureQualityTier: tier,
    detectedPatterns,
    architecturalViolations: violations,
    modularityScore: score,
  };
}

/**
 * Calculates modularity ratio given file distribution across packages/folders.
 */
export function calculateRepositoryModularityIndex(folderCounts: Record<string, number>): number {
  const folders = Object.keys(folderCounts);
  if (folders.length === 0) return 0;

  const totalFiles = Object.values(folderCounts).reduce((acc, c) => acc + c, 0);
  if (totalFiles === 0) return 0;

  // Distribution balance check
  let variance = 0;
  const avg = totalFiles / folders.length;
  for (const count of Object.values(folderCounts)) {
    variance += Math.pow(count - avg, 2);
  }
  const stdDev = Math.sqrt(variance / folders.length);
  const balanceFactor = Math.max(0, 100 - stdDev * 5);

  return Math.round(balanceFactor);
}
