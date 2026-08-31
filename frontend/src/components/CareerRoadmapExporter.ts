/**
 * Career Path Roadmap PDF & Markdown Export Engine
 */

export interface RoadmapExportData {
  title: string;
  milestoneCount: number;
  exportFormat: 'PDF' | 'MARKDOWN';
}

export class CareerRoadmapExporter {
  public static exportRoadmap(currentRole: string, targetRole: string): RoadmapExportData {
    return {
      title: `${currentRole} to ${targetRole} Roadmap`,
      milestoneCount: 3,
      exportFormat: 'MARKDOWN'
    };
  }
}
