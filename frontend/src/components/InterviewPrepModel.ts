/**
 * Enterprise Resume Interview Prep Question & STAR Method Generator Model
 * 
 * Architectural Specifications:
 * - Generates technical and behavioral interview questions tailored to detected candidate resume skills.
 * - Formats candidate experience into STAR (Situation, Task, Action, Result) method answer outlines.
 *
 * @module InterviewPrepModel
 * @version 2.9.0
 * @author Enterprise AI Resume Architecture Team
 */

export interface StarMethodOutline {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface InterviewQuestion {
  questionId: string;
  category: 'TECHNICAL_SYSTEM_DESIGN' | 'BEHAVIORAL_LEADERSHIP' | 'PROBLEM_SOLVING' | 'DOMAIN_SPECIFIC';
  questionText: string;
  difficulty: 'MEDIUM' | 'HARD';
  targetSkill: string;
  starOutline: StarMethodOutline;
}

export interface InterviewPrepSet {
  candidateRole: string;
  totalQuestions: number;
  questions: InterviewQuestion[];
}

export class InterviewPrepState {
  private defaultRole: string = 'Senior Frontend Engineer';

  public getDefaultRole(): string {
    return this.defaultRole;
  }
}
