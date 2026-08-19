/**
 * Marketing & SEO Analytics Data Engine
 * Structured metadata configurations, pricing tier calculators, candidate metrics, and FAQ datasets.
 */

export interface PricingPlan {
    id: string;
    name: string;
    priceMonthly: number;
    priceAnnual: number;
    badge?: string;
    description: string;
    features: string[];
    isPopular: boolean;
    ctaText: string;
}

export interface CandidateMetric {
    title: string;
    value: string;
    growth: string;
    description: string;
}

export interface Testimonial {
    id: string;
    author: string;
    role: string;
    company: string;
    avatarUrl: string;
    quote: string;
    rating: number;
    atsScoreBefore: number;
    atsScoreAfter: number;
}

export interface SeoMetaData {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage: string;
    keywords: string[];
    structuredDataSchema: object;
}

export const SEO_METADATA_CONFIG: SeoMetaData = {
    title: "AI Resume Analyzer - Maximize ATS Resume Scores & Land 3x More Interviews",
    description: "Transform your job search with instant AI resume keyword scoring, ATS compliance audits, interview prep feedback, and recruiter-ready formatting recommendations.",
    canonicalUrl: "https://airesumeanalyzer.com/",
    ogImage: "https://airesumeanalyzer.com/og-marketing.png",
    keywords: [
        "AI Resume Analyzer",
        "ATS Resume Checker",
        "Resume Keyword Optimizer",
        "CV Keyword Scanner",
        "Job Match Score",
        "Recruiter Resume Parser"
    ],
    structuredDataSchema: {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "AI Resume Analyzer",
        "url": "https://airesumeanalyzer.com/",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
            "@type": "Offer",
            "price": "0.00",
            "priceCurrency": "USD"
        }
    }
};

export const MARKETING_METRICS: CandidateMetric[] = [
    { title: "Resumes Analyzed", value: "1.4M+", growth: "+42% MoM", description: "Scanned across Fortune 500 applicant tracking systems" },
    { title: "Average ATS Score Increase", value: "+38 Pts", growth: "89% Pass Rate", description: "Optimization boost across Workday, Taleo, and Greenhouse" },
    { title: "Interview Call Rate", value: "3.4x", growth: "Industry Leading", description: "Higher candidate response rate within 14 days of application" },
    { title: "Time Saved Per Application", value: "45 Mins", growth: "Automated", description: "Instant keyword matching and AI summary bullet suggestions" }
];

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: "plan_free",
        name: "Starter Free",
        priceMonthly: 0,
        priceAnnual: 0,
        description: "Perfect for job seekers getting started with basic ATS keyword checks.",
        features: [
            "3 AI Resume Scans per Month",
            "Basic ATS Keyword Match Score",
            "PDF & Word Document Uploads",
            "Standard Formatting Checklist",
            "Community Support Forum"
        ],
        isPopular: false,
        ctaText: "Start Free Analysis"
    },
    {
        id: "plan_pro",
        name: "Professional Candidate",
        priceMonthly: 19,
        priceAnnual: 14,
        badge: "Most Popular",
        description: "Comprehensive AI optimization suite for active job hunters aiming for top tech & corporate roles.",
        features: [
            "Unlimited AI Resume Scans",
            "Advanced ATS Parser Simulation (Workday & Taleo)",
            "AI Bullet Point Rewrite Suggestions",
            "Tailored Job Description Keyword Matching",
            "Cover Letter AI Generator",
            "Priority 24/7 Candidate Support"
        ],
        isPopular: true,
        ctaText: "Upgrade to Pro"
    },
    {
        id: "plan_executive",
        name: "Executive & Career Coach",
        priceMonthly: 49,
        priceAnnual: 39,
        description: "Built for senior leaders, executive job seekers, and career counseling agencies.",
        features: [
            "Everything in Pro Tier",
            "Executive Leadership Summary Auditor",
            "Multi-Resume Version Management",
            "LinkedIn Profile Optimization Insights",
            "Dedicated 1-on-1 Career Strategy Session",
            "API Access & Export Rights"
        ],
        isPopular: false,
        ctaText: "Get Executive Access"
    }
];

export const SUCCESS_TESTIMONIALS: Testimonial[] = [
    {
        id: "test_1",
        author: "Sarah Jenkins",
        role: "Senior Software Engineer",
        company: "Meta",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        quote: "AI Resume Analyzer highlighted critical missing Kubernetes and Distributed Systems keywords that were causing my resume to get auto-rejected by ATS parsers.",
        rating: 5,
        atsScoreBefore: 54,
        atsScoreAfter: 92
    },
    {
        id: "test_2",
        author: "David Chen",
        role: "Product Marketing Manager",
        company: "Salesforce",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        quote: "The live ROI calculator showed me how much faster I could land interviews. After optimizing my bullet points, I received 4 interview requests in 1 week!",
        rating: 5,
        atsScoreBefore: 61,
        atsScoreAfter: 95
    }
];

export const calculateHiringRoi = (
    currentSalary: number, 
    expectedIncreasePercent: number, 
    monthsSaved: number
): { extraEarningsYearly: number; timeValueSaved: number; totalValueAdded: number } => {
    const extraEarningsYearly = currentSalary * (expectedIncreasePercent / 100);
    const monthlyRate = currentSalary / 12;
    const timeValueSaved = monthlyRate * monthsSaved;
    const totalValueAdded = extraEarningsYearly + timeValueSaved;
    return { extraEarningsYearly, timeValueSaved, totalValueAdded };
};
