/**
 * Enterprise Resume Career Path & Milestone Roadmap Generator Model
 * 
 * Architectural Specifications:
 * - Domain entities for multi-year career progression trajectory (Junior -> Mid -> Senior -> Lead -> Staff/Architect).
 * - Milestone roadmap modeling: Key technical competencies, certification requirements, project impact goals, and estimated timeframe.
 *
 * @module CareerRoadmapModel
 * @version 2.8.0
 * @author Enterprise AI Resume Architecture Team
 */

export type CareerTrack = 'SOFTWARE_ENGINEERING' | 'DATA_SCIENCE' | 'PRODUCT_MANAGEMENT' | 'CYBERSECURITY';

export interface RoadmapMilestone {
  milestoneId: string;
  stageTitle: string;
  targetTimeframeMonths: number;
  requiredSkills: string[];
  recommendedCertifications: string[];
  suggestedProjectImpact: string;
  isCurrentStage: boolean;
}

export interface CareerPathTrajectory {
  currentRole: string;
  targetRole: string;
  track: CareerTrack;
  totalEstimatedMonthsToTarget: number;
  milestones: RoadmapMilestone[];
}

export class CareerRoadmapState {
  private defaultTrack: CareerTrack = 'SOFTWARE_ENGINEERING';

  public getDefaultTrack(): CareerTrack {
    return this.defaultTrack;
  }
}
