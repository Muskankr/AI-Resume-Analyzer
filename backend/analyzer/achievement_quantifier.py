"""
Resume Achievement Quantifier Engine.

Detects unquantified achievement bullets in resumes and generates
specific metric templates, estimated impact scores, and contextual
suggestions for adding numbers, percentages, and measurable outcomes.

Unlike the content rewriter (which detects missing metrics), this module
focuses on *what metric to add* — it generates concrete templates like
"Increased [metric] by [X]%, resulting in [outcome]" based on the
context of each bullet point.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple


# ── Action verb → metric category mapping ────────────────────────────────

#: Maps action verbs to the types of metrics that naturally follow them.
VERB_METRIC_CATEGORIES: Dict[str, List[str]] = {
    "improved": ["performance", "efficiency", "speed", "accuracy", "retention"],
    "increased": ["revenue", "users", "growth", "conversion", "engagement"],
    "reduced": ["cost", "time", "errors", "latency", "overhead"],
    "saved": ["hours", "cost", "resources", "budget"],
    "delivered": ["projects", "features", "releases", "milestones"],
    "managed": ["team_size", "budget", "projects", "clients"],
    "led": ["team_size", "initiatives", "projects", "migration"],
    "built": ["users_served", "features", "integrations", "systems"],
    "developed": ["features", "components", "modules", "integrations"],
    "designed": ["systems", "architectures", "workflows", "pipelines"],
    "automated": ["processes", "workflows", "tasks", "deployments"],
    "optimized": ["performance", "load_time", "throughput", "efficiency"],
    "scaled": ["users", "traffic", "infrastructure", "capacity"],
    "launched": ["products", "features", "campaigns", "services"],
    "migrated": ["systems", "users", "data", "services"],
    "deployed": ["services", "applications", "environments", "updates"],
    "architected": ["systems", "platforms", "microservices", "pipelines"],
    "spearheaded": ["initiatives", "projects", "transformations", "efforts"],
    "coordinated": ["teams", "events", "launches", "efforts"],
    "mentored": ["engineers", "team_members", "interns", "juniors"],
    "resolved": ["issues", "bugs", "incidents", "tickets"],
    "streamlined": ["processes", "workflows", "operations", "onboarding"],
    "accelerated": ["delivery", "development", "ramp_up", "adoption"],
    "transformed": ["processes", "systems", "workflows", "culture"],
    "generated": ["leads", "revenue", "traffic", "engagement"],
    "maintained": ["uptime", "SLA", "availability", "performance"],
}

#: Metric templates keyed by category. Each template is a format string
#: with named placeholders.
METRIC_TEMPLATES: Dict[str, List[Dict[str, str]]] = {
    "performance": [
        {"template": "Improved [component] performance by [X]%, reducing [metric] from [before] to [after]", "example": "Improved API performance by 40%, reducing response time from 800ms to 480ms"},
        {"template": "Optimized [component] achieving [X]x faster [metric]", "example": "Optimized query engine achieving 3x faster data retrieval"},
    ],
    "efficiency": [
        {"template": "Increased [process] efficiency by [X]%, saving [time] per [period]", "example": "Increased deployment efficiency by 60%, saving 4 hours per release"},
        {"template": "Streamlined [process] reducing [metric] by [X]%", "example": "Streamlined code review process reducing turnaround time by 35%"},
    ],
    "speed": [
        {"template": "Reduced [metric] load time by [X]%, from [before] to [after]", "example": "Reduced dashboard load time by 50%, from 4s to 2s"},
        {"template": "Achieved [X]ms average response time for [component]", "example": "Achieved 120ms average response time for search API"},
    ],
    "accuracy": [
        {"template": "Improved [metric] accuracy by [X]%, reducing errors from [before] to [after]", "example": "Improved data validation accuracy by 25%, reducing false positives from 15% to 3%"},
    ],
    "retention": [
        {"template": "Increased user retention by [X]% through [initiative]", "example": "Increased user retention by 20% through personalized onboarding flows"},
    ],
    "revenue": [
        {"template": "Generated $[amount] in [revenue_type] through [initiative]", "example": "Generated $2.5M in annual recurring revenue through new feature launches"},
        {"template": "Increased revenue by [X]% via [strategy]", "example": "Increased revenue by 35% via upsell campaigns"},
    ],
    "users": [
        {"template": "Scaled [product] to [X]K+ active users", "example": "Scaled mobile app to 500K+ active users across 12 countries"},
        {"template": "Served [X]K daily active users with [reliability]", "example": "Served 200K daily active users with 99.9% uptime"},
    ],
    "growth": [
        {"template": "Achieved [X]% month-over-month growth in [metric]", "example": "Achieved 25% month-over-month growth in user signups"},
    ],
    "conversion": [
        {"template": "Improved conversion rate by [X]%, from [before]% to [after]%", "example": "Improved conversion rate by 15%, from 3.2% to 4.7%"},
    ],
    "engagement": [
        {"template": "Increased [metric] engagement by [X]%", "example": "Increased daily active user engagement by 40%"},
    ],
    "cost": [
        {"template": "Reduced infrastructure costs by $[amount]/month ([X]%)", "example": "Reduced infrastructure costs by $12K/month (30%) through containerization"},
        {"template": "Cut [expense] by [X]%, saving $[amount] annually", "example": "Cut cloud spend by 25%, saving $180K annually"},
    ],
    "time": [
        {"template": "Reduced [process] time by [X]%, from [before] to [after]", "example": "Reduced CI/CD pipeline time by 70%, from 45min to 13min"},
        {"template": "Saved [X] hours per [period] by [automation]", "example": "Saved 20 hours per week by automating report generation"},
    ],
    "errors": [
        {"template": "Reduced [metric] errors by [X]%, from [before]/month to [after]/month", "example": "Reduced production errors by 85%, from 50/month to 8/month"},
    ],
    "latency": [
        {"template": "Decreased [component] latency by [X]%, from [before]ms to [after]ms", "example": "Decreased search latency by 60%, from 500ms to 200ms"},
    ],
    "overhead": [
        {"template": "Reduced operational overhead by [X] hours/week through [solution]", "example": "Reduced operational overhead by 15 hours/week through automated monitoring"},
    ],
    "hours": [
        {"template": "Saved [X] hours per [period] by [action]", "example": "Saved 40 hours per sprint by implementing automated testing"},
    ],
    "budget": [
        {"template": "Managed $[amount] annual budget for [scope]", "example": "Managed $2M annual budget for cloud infrastructure across 5 teams"},
    ],
    "team_size": [
        {"template": "Led a cross-functional team of [X] engineers across [Y] projects", "example": "Led a cross-functional team of 12 engineers across 3 product lines"},
        {"template": "Managed [X]-person team delivering [outcome]", "example": "Managed 8-person team delivering 4 major releases per quarter"},
    ],
    "projects": [
        {"template": "Delivered [X] projects on time and within budget", "example": "Delivered 6 projects on time and within budget in FY2025"},
    ],
    "features": [
        {"template": "Shipped [X] features reaching [Y]K+ users", "example": "Shipped 15 features reaching 100K+ users in 6 months"},
    ],
    "integrations": [
        {"template": "Built [X] third-party integrations serving [Y] clients", "example": "Built 8 third-party integrations serving 50+ enterprise clients"},
    ],
    "systems": [
        {"template": "Architected [system] handling [X]K requests/day", "example": "Architected event-driven system handling 500K requests/day"},
    ],
    "architectures": [
        {"template": "Designed [architecture] supporting [X]x traffic growth", "example": "Designed microservices architecture supporting 10x traffic growth"},
    ],
    "workflows": [
        {"template": "Designed [workflow] reducing [metric] by [X]%", "example": "Designed CI/CD workflow reducing deployment failures by 90%"},
    ],
    "pipelines": [
        {"template": "Built [pipeline] processing [X]K records/day", "example": "Built ETL pipeline processing 500K records/day with 99.9% reliability"},
    ],
    "processes": [
        {"template": "Automated [X] manual processes, saving [Y] hours/week", "example": "Automated 12 manual processes, saving 30 hours/week across the team"},
    ],
    "tasks": [
        {"template": "Automated [X] recurring tasks eliminating [Y] hours of manual work", "example": "Automated 8 recurring tasks eliminating 20 hours of manual work weekly"},
    ],
    "deployments": [
        {"template": "Automated deployments reducing release cycle from [before] to [after]", "example": "Automated deployments reducing release cycle from 2 weeks to 2 hours"},
    ],
    "users_served": [
        {"template": "Built [product] serving [X]K+ users with [reliability]", "example": "Built analytics dashboard serving 300K+ users with 99.95% uptime"},
    ],
    "traffic": [
        {"template": "Scaled infrastructure to handle [X]x traffic spike during [event]", "example": "Scaled infrastructure to handle 50x traffic spike during product launch"},
    ],
    "capacity": [
        {"template": "Expanded system capacity by [X]x to support [goal]", "example": "Expanded system capacity by 10x to support international expansion"},
    ],
    "products": [
        {"template": "Launched [X] products generating $[amount] in first [period]", "example": "Launched 2 products generating $800K in first quarter"},
    ],
    "campaigns": [
        {"template": "Launched [X] campaigns reaching [Y]K users with [result]", "example": "Launched 5 campaigns reaching 200K users with 12% click-through rate"},
    ],
    "data": [
        {"template": "Migrated [X]TB of data with zero downtime", "example": "Migrated 5TB of data with zero downtime across 3 environments"},
    ],
    "services": [
        {"template": "Deployed [X] services with [Y]% uptime SLA", "example": "Deployed 12 services with 99.99% uptime SLA"},
    ],
    "environments": [
        {"template": "Managed [X] production environments across [Y] regions", "example": "Managed 8 production environments across 3 regions"},
    ],
    "initiatives": [
        {"template": "Spearheaded [X] initiatives resulting in [outcome]", "example": "Spearheaded 3 initiatives resulting in 20% operational cost reduction"},
    ],
    "migrations": [
        {"template": "Led migration of [X] services from [old] to [new]", "example": "Led migration of 15 services from monolith to microservices"},
    ],
    "engineers": [
        {"template": "Mentored [X] engineers, [Y] of whom were promoted", "example": "Mentored 6 engineers, 3 of whom were promoted within 12 months"},
    ],
    "team_members": [
        {"template": "Trained [X] team members on [technology]", "example": "Trained 10 team members on Kubernetes, reducing support tickets by 40%"},
    ],
    "issues": [
        {"template": "Resolved [X]+ production incidents, maintaining [SLA]", "example": "Resolved 200+ production incidents, maintaining 99.9% uptime SLA"},
    ],
    "bugs": [
        {"template": "Fixed [X] critical bugs reducing production errors by [Y]%", "example": "Fixed 45 critical bugs reducing production errors by 70%"},
    ],
    "incidents": [
        {"template": "Led incident response for [X] P0 incidents with [Y]min MTTR", "example": "Led incident response for 15 P0 incidents with 12min MTTR"},
    ],
    "tickets": [
        {"template": "Resolved [X] support tickets with [Y]% satisfaction rate", "example": "Resolved 500+ support tickets with 98% satisfaction rate"},
    ],
    "SLA": [
        {"template": "Maintained [X]% uptime SLA across [Y] services", "example": "Maintained 99.95% uptime SLA across 20+ microservices"},
    ],
    "uptime": [
        {"template": "Achieved [X]% uptime for [system] serving [Y] users", "example": "Achieved 99.99% uptime for payment system serving 1M+ users"},
    ],
    "availability": [
        {"template": "Ensured [X]% availability for [system] during [period]", "example": "Ensured 99.9% availability for critical services during Black Friday"},
    ],
    "throughput": [
        {"template": "Increased system throughput by [X]x, handling [Y]K req/s", "example": "Increased system throughput by 5x, handling 50K req/s"},
    ],
    "load_time": [
        {"template": "Reduced page load time by [X]%, from [before]s to [after]s", "example": "Reduced page load time by 65%, from 4.2s to 1.5s"},
    ],
    "onboarding": [
        {"template": "Streamlined onboarding reducing ramp-up time by [X]%", "example": "Streamlined onboarding reducing new hire ramp-up time by 50%"},
    ],
    "development": [
        {"template": "Accelerated development velocity by [X]%", "example": "Accelerated development velocity by 40% through improved tooling"},
    ],
    "ramp_up": [
        {"template": "Reduced new hire ramp-up time from [before] to [after] weeks", "example": "Reduced new hire ramp-up time from 8 weeks to 3 weeks"},
    ],
    "adoption": [
        {"template": "Drove [X]% adoption of [tool/practice] across [Y] teams", "example": "Drove 90% adoption of CI/CD practices across 8 engineering teams"},
    ],
    "culture": [
        {"transformed": "Transformed engineering culture achieving [X]% improvement in [metric]", "example": "Transformed engineering culture achieving 35% improvement in developer satisfaction"},
    ],
    "leads": [
        {"template": "Generated [X]K qualified leads through [strategy]", "example": "Generated 15K qualified leads through content marketing strategy"},
    ],
    "releases": [
        {"template": "Delivered [X] releases on schedule with [Y]% less defects", "example": "Delivered 12 releases on schedule with 40% fewer defects"},
    ],
    "milestones": [
        {"template": "Achieved [X] key milestones [ahead of/on] schedule", "example": "Achieved 5 key milestones ahead of schedule in Q3 2025"},
    ],
    "clients": [
        {"template": "Managed [X]+ enterprise clients with [Y]% retention rate", "example": "Managed 50+ enterprise clients with 95% retention rate"},
    ],
    "components": [
        {"template": "Developed [X] reusable components used across [Y] projects", "example": "Developed 25 reusable components used across 6 projects"},
    ],
    "modules": [
        {"template": "Built [X] core modules powering [product]", "example": "Built 8 core modules powering the analytics platform"},
    ],
    "platforms": [
        {"template": "Architected [platform] handling [X]K+ daily transactions", "example": "Architected payment platform handling 100K+ daily transactions"},
    ],
    "microservices": [
        {"template": "Designed [X]-service microservices architecture", "example": "Designed 20-service microservices architecture replacing monolith"},
    ],
    "interns": [
        {"template": "Mentored [X] interns, [Y]% received return offers", "example": "Mentored 4 interns, 100% received return offers"},
    ],
    "juniors": [
        {"template": "Guided [X] junior engineers through [program]", "example": "Guided 5 junior engineers through structured growth program"},
    ],
    "events": [
        {"template": "Coordinated [X] events with [Y]K+ attendees", "example": "Coordinated 8 tech meetups with 500+ total attendees"},
    ],
    "efforts": [
        {"template": "Spearheaded [X] cross-team efforts resulting in [outcome]", "example": "Spearheaded 4 cross-team efforts resulting in 30% faster delivery"},
    ],
    "migration": [
        {"template": "Led migration of [X] services from [old] to [new]", "example": "Led migration of 12 services from REST to GraphQL"},
    ],
    "tooling": [
        {"template": "Built [X] internal tools used by [Y]+ engineers", "example": "Built 6 internal tools used by 40+ engineers daily"},
    ],
    "testing": [
        {"template": "Implemented [X] test suite achieving [Y]% code coverage", "example": "Implemented comprehensive test suite achieving 92% code coverage"},
    ],
    "monitoring": [
        {"template": "Deployed [X] monitoring alerts reducing MTTR by [Y]%", "example": "Deployed 30 monitoring alerts reducing MTTR by 60%"},
    ],
    "documentation": [
        {"template": "Created [X]+ pages of technical documentation", "example": "Created 200+ pages of technical documentation for 15 microservices"},
    ],
    "training": [
        {"template": "Conducted [X] training sessions for [Y]+ team members", "example": "Conducted 12 training sessions for 30+ team members on security best practices"},
    ],
    "planning": [
        {"template": "Led sprint planning for [X]-person team across [Y] workstreams", "example": "Led sprint planning for 10-person team across 3 workstreams"},
    ],
    "collaboration": [
        {"template": "Facilitated cross-functional collaboration between [X] teams", "example": "Facilitated cross-functional collaboration between engineering, product, and design teams"},
    ],
    "standards": [
        {"template": "Established [X] coding standards adopted across [Y] repositories", "example": "Established 8 coding standards adopted across 25 repositories"},
    ],
    "automation": [
        {"template": "Automated [X] processes eliminating [Y] hours of manual work", "example": "Automated 10 processes eliminating 50 hours of manual work monthly"},
    ],
    "optimization": [
        {"template": "Optimized [X] reducing [metric] by [Y]%", "example": "Optimized database queries reducing average query time by 75%"},
    ],
    "innovation": [
        {"template": "Pioneered [X] resulting in [measurable outcome]", "example": "Pioneered real-time analytics pipeline resulting in 10x faster insights"},
    ],
    "governance": [
        {"template": "Established [X] governance policies across [Y] teams", "example": "Established data governance policies across 6 engineering teams"},
    ],
    "compliance": [
        {"template": "Achieved [certification] compliance for [scope]", "example": "Achieved SOC2 Type II compliance for all customer-facing services"},
    ],
    "security": [
        {"template": "Hardened [X] reducing vulnerability count by [Y]%", "example": "Hardened infrastructure reducing critical vulnerability count by 90%"},
    ],
    "reliability": [
        {"template": "Improved system reliability from [X]% to [Y]% uptime", "example": "Improved system reliability from 99.5% to 99.99% uptime"},
    ],
    "scalability": [
        {"template": "Designed for scalability supporting [X]x traffic growth", "example": "Designed for scalability supporting 20x traffic growth during peak"},
    ],
    "availability_type": [
        {"template": "Ensured [X]% availability for [system] across [Y] regions", "example": "Ensured 99.99% availability for payment system across 3 regions"},
    ],
    "delivery": [
        {"template": "Accelerated delivery from [before] to [after] cadence", "example": "Accelerated delivery from monthly to weekly release cadence"},
    ],
    "search": [
        {"template": "Improved search relevance by [X]%, increasing [metric] by [Y]%", "example": "Improved search relevance by 35%, increasing click-through rate by 20%"},
    ],
    "notifications": [
        {"template": "Built notification system reaching [X]K+ users with [Y]% open rate", "example": "Built notification system reaching 100K+ users with 45% open rate"},
    ],
    "analytics": [
        {"template": "Built analytics dashboard tracking [X]K+ data points daily", "example": "Built analytics dashboard tracking 500K+ data points daily"},
    ],
    "payments": [
        {"template": "Processed $[X]M in transactions with [Y]% success rate", "example": "Processed $10M in transactions with 99.97% success rate"},
    ],
    "infrastructure": [
        {"template": "Managed [X]-node infrastructure serving [Y]K+ users", "example": "Managed 50-node infrastructure serving 200K+ users globally"},
    ],
    "cloud": [
        {"template": "Migrated [X] workloads to cloud reducing costs by [Y]%", "example": "Migrated 20 workloads to cloud reducing costs by 35%"},
    ],
    "database": [
        {"template": "Optimized database handling [X]M records with [Y]ms queries", "example": "Optimized database handling 50M records with sub-50ms queries"},
    ],
    "api": [
        {"template": "Built [X] APIs serving [Y]K+ requests/day", "example": "Built 15 REST APIs serving 1M+ requests/day"},
    ],
    "frontend": [
        {"template": "Built [X]-page frontend with [Y]ms LCP", "example": "Built 50-page frontend with 1.2s LCP score"},
    ],
    "backend": [
        {"template": "Developed backend processing [X]K transactions/day", "example": "Developed backend processing 200K transactions/day"},
    ],
    "mobile": [
        {"template": "Built [X]-screen mobile app with [Y]K downloads", "example": "Built 25-screen mobile app with 50K+ downloads"},
    ],
    "ai_ml": [
        {"template": "Deployed [X] ML models achieving [Y]% accuracy", "example": "Deployed 5 ML models achieving 95%+ accuracy on production data"},
    ],
    "data_pipeline": [
        {"template": "Built data pipeline processing [X]TB daily", "example": "Built data pipeline processing 2TB daily with real-time streaming"},
    ],
    "real_time": [
        {"template": "Built real-time system handling [X]K events/second", "example": "Built real-time system handling 100K events/second"},
    ],
    "devops": [
        {"template": "Implemented DevOps practices reducing deployment time by [X]%", "example": "Implemented DevOps practices reducing deployment time by 80%"},
    ],
    "ci_cd": [
        {"template": "Built CI/CD pipeline reducing build time from [before] to [after]", "example": "Built CI/CD pipeline reducing build time from 30min to 5min"},
    ],
    "monitoring_type": [
        {"template": "Deployed monitoring covering [X] services with [Y] alerts", "example": "Deployed monitoring covering 30 services with 100+ alerts"},
    ],
    "cost_optimization": [
        {"template": "Optimized costs saving $[X]K annually", "example": "Optimized cloud costs saving $200K annually"},
    ],
    "incident_response": [
        {"template": "Reduced MTTR from [before] to [after] minutes", "example": "Reduced MTTR from 45min to 8 minutes"},
    ],
    "capacity_planning": [
        {"template": "Planned capacity for [X]x growth supporting [Y] users", "example": "Planned capacity for 5x growth supporting 1M users"},
    ],
}


# ── Data classes ──────────────────────────────────────────────────────────

@dataclass
class MetricSuggestion:
    """A specific metric template suggestion for a bullet point."""
    template: str
    example: str
    category: str
    confidence: float  # 0.0-1.0

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BulletQuantification:
    """Analysis and suggestions for a single bullet point."""
    original_text: str
    line_number: int
    detected_verb: Optional[str]
    detected_category: Optional[str]
    is_quantified: bool
    suggestions: List[MetricSuggestion]
    priority: str  # "high" | "medium" | "low"
    estimated_impact: int  # 1-10

    def as_dict(self) -> Dict[str, Any]:
        return {
            "original_text": self.original_text,
            "line_number": self.line_number,
            "detected_verb": self.detected_verb,
            "detected_category": self.detected_category,
            "is_quantified": self.is_quantified,
            "suggestions": [s.as_dict() for s in self.suggestions],
            "priority": self.priority,
            "estimated_impact": self.estimated_impact,
        }


@dataclass
class QuantificationResult:
    """Complete quantification analysis."""
    total_bullets: int
    quantified_bullets: int
    unquantified_bullets: int
    quantification_rate: float  # percentage
    overall_impact_score: int  # 0-100
    bullet_analyses: List[BulletQuantification]
    top_quick_wins: List[BulletQuantification]
    category_coverage: Dict[str, int]
    summary: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "total_bullets": self.total_bullets,
            "quantified_bullets": self.quantified_bullets,
            "unquantified_bullets": self.unquantified_bullets,
            "quantification_rate": self.quantification_rate,
            "overall_impact_score": self.overall_impact_score,
            "bullet_analyses": [b.as_dict() for b in self.bullet_analyses],
            "top_quick_wins": [b.as_dict() for b in self.top_quick_wins],
            "category_coverage": self.category_coverage,
            "summary": self.summary,
        }


# ── Detection patterns ───────────────────────────────────────────────────

BULLET_PATTERN = re.compile(r"^\s*(?:[-–—*•▪▫▸▹●○◦‣∙·]|\d+[.)])\s+")

QUANTIFICATION_PATTERNS = [
    re.compile(r"\d+%"),
    re.compile(r"\$\d+"),
    re.compile(r"\d+\s*(?:users?|customers?|team\s*members?|projects?|sites?|tickets?|accounts?|clients?)"),
    re.compile(r"\d+x\b"),
    re.compile(r"\d+\s*(?:million|thousand|billion|k\b)"),
    re.compile(r"\d+\s*(?:hours?|days?|weeks?|months?)\s*(?:saved|reduced|faster|per)"),
    re.compile(r"increased\s+by\s+\d+"),
    re.compile(r"reduced\s+by\s+\d+"),
    re.compile(r"improved\s+by\s+\d+"),
    re.compile(r"from\s+\d+"),
    re.compile(r"to\s+\d+"),
    re.compile(r"\d+[.,]\d+"),
]

WEAK_VERB_PATTERNS = [
    (re.compile(r"\b(responsible for|worked on|helped with|assisted in|involved in|tasked with|duties included|participated in|handled)\b", re.IGNORECASE), "weak_verb"),
]


# ── Engine ────────────────────────────────────────────────────────────────

def _is_bullet(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) < 15:
        return False
    return bool(BULLET_PATTERN.match(stripped)) or len(stripped.split()) >= 6


def _has_quantification(text: str) -> bool:
    return any(p.search(text) for p in QUANTIFICATION_PATTERNS)


def _detect_verb(text: str) -> Optional[str]:
    lower = text.lower()
    stripped = BULLET_PATTERN.sub("", lower).strip()
    words = re.split(r"[^a-z]+", stripped)
    for word in words:
        if word in VERB_METRIC_CATEGORIES:
            return word
    return None


def _detect_weak_verb(text: str) -> Optional[str]:
    lower = text.lower()
    for pattern, _ in WEAK_VERB_PATTERNS:
        match = pattern.search(lower)
        if match:
            return match.group(1)
    return None


def _get_suggestions(category: str, count: int = 3) -> List[MetricSuggestion]:
    templates = METRIC_TEMPLATES.get(category, [])
    return [
        MetricSuggestion(
            template=t["template"],
            example=t["example"],
            category=category,
            confidence=max(0.3, 1.0 - i * 0.2),
        )
        for i, t in enumerate(templates[:count])
    ]


def _priority_for(verb: Optional[str], weak: Optional[str], quantified: bool) -> str:
    if weak:
        return "high"
    if not quantified and verb:
        return "high"
    if not quantified:
        return "medium"
    return "low"


def _impact_score(verb: Optional[str], weak: Optional[str], quantified: bool) -> int:
    if weak:
        return 8
    if not quantified and verb:
        return 7
    if not quantified:
        return 5
    return 2


def _generate_summary(
    total: int, quantified: int, unquantified: int, rate: float
) -> str:
    if total == 0:
        return "No bullet points detected in the resume."
    if rate >= 80:
        opening = "Excellent quantification coverage!"
    elif rate >= 60:
        opening = "Good quantification with room for improvement."
    elif rate >= 40:
        opening = "Moderate quantification — several bullets need metrics."
    else:
        opening = "Low quantification — most bullets lack measurable outcomes."
    return (
        f"{opening} {quantified} of {total} bullets ({rate}%) contain "
        f"quantified achievements. {unquantified} bullets could benefit "
        f"from specific metrics."
    )


# ── Public API ────────────────────────────────────────────────────────────

def quantify_achievements(resume_text: str) -> QuantificationResult:
    """Analyse resume bullets and suggest quantification metrics.

    Args:
        resume_text: Full extracted text of a resume.

    Returns:
        A ``QuantificationResult`` with per-bullet analysis and suggestions.
    """
    lines = resume_text.splitlines()
    analyses: List[BulletQuantification] = []
    category_counts: Dict[str, int] = {}

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or not _is_bullet(stripped):
            continue

        quantified = _has_quantification(stripped)
        verb = _detect_verb(stripped)
        weak = _detect_weak_verb(stripped)
        category = VERB_METRIC_CATEGORIES.get(verb, ["general"])[0] if verb else None

        suggestions: List[MetricSuggestion] = []
        if not quantified and category:
            suggestions = _get_suggestions(category)
        elif not quantified:
            # Fallback: suggest general metrics
            suggestions = [
                MetricSuggestion(
                    template="Add a specific metric: [action] [X]% [result]",
                    example="e.g., 'Improved performance by 30%, reducing load time from 4s to 2s'",
                    category="general",
                    confidence=0.5,
                )
            ]

        priority = _priority_for(verb, weak, quantified)
        impact = _impact_score(verb, weak, quantified)

        if category:
            category_counts[category] = category_counts.get(category, 0) + 1

        analyses.append(BulletQuantification(
            original_text=stripped,
            line_number=i + 1,
            detected_verb=verb or (weak if weak else None),
            detected_category=category,
            is_quantified=quantified,
            suggestions=suggestions,
            priority=priority,
            estimated_impact=impact,
        ))

    total = len(analyses)
    quantified = sum(1 for a in analyses if a.is_quantified)
    unquantified = total - quantified
    rate = round((quantified / total) * 100, 1) if total > 0 else 0.0

    # Overall impact: how much could adding metrics improve the resume
    potential_gain = sum(a.estimated_impact for a in analyses if not a.is_quantified)
    max_gain = total * 10 if total > 0 else 1
    overall_score = max(0, min(100, round(100 - (potential_gain / max_gain) * 100)))

    # Top quick wins: unquantified bullets with verb context
    quick_wins = sorted(
        [a for a in analyses if not a.is_quantified],
        key=lambda a: -a.estimated_impact,
    )[:5]

    summary = _generate_summary(total, quantified, unquantified, rate)

    return QuantificationResult(
        total_bullets=total,
        quantified_bullets=quantified,
        unquantified_bullets=unquantified,
        quantification_rate=rate,
        overall_impact_score=overall_score,
        bullet_analyses=analyses,
        top_quick_wins=quick_wins,
        category_coverage=category_counts,
        summary=summary,
    )
