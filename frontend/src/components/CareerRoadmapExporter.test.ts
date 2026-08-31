/**
 * Unit Tests for Career Roadmap Exporter
 */

import { describe, it, expect } from 'vitest';
import { CareerRoadmapExporter } from './CareerRoadmapExporter';

describe('CareerRoadmapExporter Tests', () => {
  it('should export roadmap Markdown metadata correctly', () => {
    const res = CareerRoadmapExporter.exportRoadmap('Dev', 'Architect');
    expect(res.title).toContain('Dev to Architect');
    expect(res.exportFormat).toBe('MARKDOWN');
  });
});
