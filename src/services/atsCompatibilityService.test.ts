import { analyzeAtsCompatibility, estimateAtsPassRate } from './atsCompatibilityService'

const STRONG_RESUME = `Jordan Lee
jordan.lee@example.com  (555) 123-4567  linkedin.com/in/jordanlee  Austin, TX

Summary
Backend engineer with six years building payment and data platforms.

Work Experience
Senior Software Engineer, PayGrid
Mar 2021 - Present
- Led the billing service migration, cutting p95 latency by 40 percent and spend by 30000 dollars per year.
- Built an ingestion pipeline processing 2000000 events per day.
- Mentored 4 engineers and shipped 18 releases with zero rollbacks.
- Designed and documented 25 REST endpoints used by every internal team.

Software Engineer, DataForge
Jun 2018 - Feb 2021
- Improved dashboard load time from 9 seconds to under 2 seconds for 15000 users.
- Automated releases, reducing deploy time from 3 hours to 20 minutes.
- Implemented structured logging that reduced mean time to detection by 55 percent.
- Migrated 120 database tables to a partitioned schema with zero downtime.

Education
B.S. in Computer Science, University of Texas at Austin, 2018

Skills
Python, Django, Flask, PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS,
Terraform, REST, GraphQL, Grafana, Prometheus, Git, Linux, pytest`

const WEAK_RESUME =
  'SEEKING AN OPPORTUNITY WHERE I CAN GROW AND CONTRIBUTE MY BEST WORK. ' +
  'I AM A HARD WORKING TEAM PLAYER WITH A PASSION FOR EXCELLENCE. '.repeat(6)

describe('analyzeAtsCompatibility', () => {
  it('returns ten fully-explained criteria that sum to the overall score', () => {
    const r = analyzeAtsCompatibility(STRONG_RESUME)
    expect(r.criteria).toHaveLength(10)
    expect(r.overallScore).toBe(r.criteria.reduce((s, c) => s + c.earned, 0))
    for (const c of r.criteria) {
      expect(c.max).toBe(10)
      expect(c.earned).toBeGreaterThanOrEqual(0)
      expect(c.earned).toBeLessThanOrEqual(10)
      expect(c.whyItMatters).toBeTruthy()
      expect(c.evidence.length).toBeGreaterThan(0)
      expect(['pass', 'warn', 'fail']).toContain(c.status)
    }
  })

  it('scores an ATS-friendly resume highly', () => {
    const r = analyzeAtsCompatibility(STRONG_RESUME)
    expect(r.overallScore).toBeGreaterThanOrEqual(85)
    expect(['A', 'B']).toContain(r.grade)
    expect(r.estimatedAtsPassRate).toBeGreaterThanOrEqual(70)
  })

  it('fails a weak resume and caps its pass rate', () => {
    const r = analyzeAtsCompatibility(WEAK_RESUME)
    expect(r.overallScore).toBeLessThan(45)
    expect(r.grade).toBe('F')
    // no email + no Experience heading -> both caps apply
    expect(r.estimatedAtsPassRate).toBeLessThanOrEqual(35)
    expect(r.prioritizedFixes.length).toBeGreaterThan(0)
  })

  it('treats an empty resume as unparseable', () => {
    const r = analyzeAtsCompatibility('')
    expect(r.estimatedAtsPassRate).toBe(0)
    expect(r.grade).toBe('F')
    const purity = r.criteria.find((c) => c.id === 'text_purity')!
    expect(purity.earned).toBe(0)
  })

  it('lowers the keyword score when the job description mentions unrelated tools', () => {
    const jd = 'Backend engineer in Rust, gRPC, ClickHouse, Elasticsearch on Google Cloud with Bazel.'
    const withJd = analyzeAtsCompatibility(STRONG_RESUME, { jobDescription: jd })
    const withoutJd = analyzeAtsCompatibility(STRONG_RESUME)
    const kwWith = withJd.criteria.find((c) => c.id === 'keywords')!
    const kwWithout = withoutJd.criteria.find((c) => c.id === 'keywords')!
    expect(kwWith.earned).toBeLessThan(kwWithout.earned)
  })

  it('flags a table/column layout', () => {
    const flagged = analyzeAtsCompatibility(STRONG_RESUME, { hasTables: true })
    const tbl = flagged.criteria.find((c) => c.id === 'tables_columns')!
    expect(tbl.status).toBe('fail')
  })

  it('orders prioritized fixes: high severity first, then by points', () => {
    const fixes = analyzeAtsCompatibility(WEAK_RESUME).prioritizedFixes
    const highs = fixes.filter((f) => f.severity === 'high')
    expect(fixes.slice(0, highs.length)).toEqual(highs)
    expect(highs.map((f) => f.points)).toEqual([...highs.map((f) => f.points)].sort((a, b) => b - a))
  })
})

describe('estimateAtsPassRate', () => {
  it('is monotonic and bounded', () => {
    const rates = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(estimateAtsPassRate)
    expect(rates).toEqual([...rates].sort((a, b) => a - b))
    expect(estimateAtsPassRate(0)).toBe(3)
    expect(estimateAtsPassRate(100)).toBeGreaterThanOrEqual(95)
  })
})
