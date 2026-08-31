/**
 * Career Path Certification & Skill Requirement Evaluator Extensions
 */

export interface CertificationRequirementCheck {
  certificationName: string;
  isRecommended: boolean;
  priorityScore: number;
}

export class CareerCertificationEvaluator {
  public static evaluateCertifications(track: string): CertificationRequirementCheck[] {
    if (track === 'SOFTWARE_ENGINEERING') {
      return [
        { certificationName: 'AWS Certified Solutions Architect', isRecommended: true, priorityScore: 90 },
        { certificationName: 'Certified Kubernetes Administrator (CKA)', isRecommended: true, priorityScore: 85 }
      ];
    }
    return [
      { certificationName: 'PMI Agile Certified Practitioner (PMI-ACP)', isRecommended: true, priorityScore: 80 }
    ];
  }
}
