/**
 * Salary Negotiation Strategy & Offer Evaluator Extensions
 */

export interface OfferEvaluation {
  offerBaseUsd: number;
  marketMedianUsd: number;
  percentileRank: number;
  negotiationRecommendation: string;
}

export class SalaryNegotiationEngine {
  public static evaluateOffer(offerBaseUsd: number, marketMedianUsd: number): OfferEvaluation {
    const ratio = offerBaseUsd / marketMedianUsd;
    const percentileRank = Math.min(99, Math.round(ratio * 50));

    let recommendation = 'Offer is well above market median. Great competitive package.';
    if (ratio < 0.90) {
      recommendation = 'Offer is below market p50 median. Recommend countering for +10-15% base salary boost.';
    }

    return {
      offerBaseUsd,
      marketMedianUsd,
      percentileRank,
      negotiationRecommendation: recommendation
    };
  }
}
