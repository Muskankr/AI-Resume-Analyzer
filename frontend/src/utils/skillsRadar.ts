/**
 * Skills Radar — categorisation & geometry helpers.
 *
 * Each detected skill is mapped into one of a fixed set of domains. The
 * count per domain (normalised to 0-1) drives the spider / radar chart.
 */

// ── Domain definitions ───────────────────────────────────────────────────────

export interface SkillDomain {
  /** Machine-readable key (also used as CSS class suffix). */
  key: string
  /** Human-readable label shown on the chart axis. */
  label: string
  /** Hex colour for the radar fill / stroke. */
  color: string
  /** Emoji icon for the legend. */
  icon: string
}

export const SKILL_DOMAINS: SkillDomain[] = [
  { key: 'frontend', label: 'Frontend', color: '#6366f1', icon: '🎨' },
  { key: 'backend', label: 'Backend', color: '#22c55e', icon: '⚙️' },
  { key: 'database', label: 'Database', color: '#f59e0b', icon: '🗄️' },
  { key: 'devops', label: 'DevOps', color: '#ef4444', icon: '🚀' },
  { key: 'cloud', label: 'Cloud', color: '#06b6d4', icon: '☁️' },
  { key: 'aiml', label: 'AI / ML', color: '#a855f7', icon: '🤖' },
  { key: 'testing', label: 'Testing', color: '#ec4899', icon: '🧪' },
  { key: 'tools', label: 'Tools', color: '#14b8a6', icon: '🔧' },
  { key: 'languages', label: 'Languages', color: '#f97316', icon: '📝' },
  { key: 'soft', label: 'Soft Skills', color: '#84cc16', icon: '💬' },
]

// ── Skill → Domain mapping ───────────────────────────────────────────────────

/**
 * Each entry maps one or more keywords (lower-cased) to a domain key.
 * Order matters: the first match wins, so more specific keywords should
 * come before broader ones.
 */
const SKILL_KEYWORD_MAP: Array<{ patterns: string[]; domain: string }> = [
  // ── Frontend ──
  { patterns: ['react', 'reactjs', 'react.js', 'nextjs', 'next.js', 'vue', 'vuejs', 'vue.js', 'angular', 'svelte', 'sveltekit'], domain: 'frontend' },
  { patterns: ['html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'chakra ui'], domain: 'frontend' },
  { patterns: ['typescript', 'javascript', 'js', 'tsx', 'jsx', 'web components', 'webpack', 'vite', 'esbuild', 'rollup'], domain: 'frontend' },
  { patterns: ['redux', 'zustand', 'mobx', 'recoil', 'jotai', 'pinia', 'vuex', 'ngrx', 'context api'], domain: 'frontend' },
  { patterns: ['d3', 'd3.js', 'three.js', 'threejs', 'webgl', 'canvas', 'svg animation', 'framer motion', 'gsap', 'lottie'], domain: 'frontend' },
  { patterns: ['figma', 'storybook', 'chromatic', 'playwright visual', 'screenshot', 'responsive design', 'mobile-first', 'a11y', 'accessibility', 'wcag'], domain: 'frontend' },

  // ── Backend ──
  { patterns: ['django', 'flask', 'fastapi', 'express', 'expressjs', 'nestjs', 'nest.js', 'koa', 'hapi'], domain: 'backend' },
  { patterns: ['spring', 'spring boot', 'springboot', 'springframework', '.net', 'dotnet', 'asp.net', 'c#'], domain: 'backend' },
  { patterns: ['rails', 'ruby on rails', 'sinatra', 'laravel', 'symfony', 'codeigniter'], domain: 'backend' },
  { patterns: ['graphql', 'rest', 'restful', 'grpc', 'websocket', 'websockets', 'api design', 'api gateway', 'oauth', 'jwt'], domain: 'backend' },
  { patterns: ['microservices', 'message queue', 'rabbitmq', 'kafka', 'redis', 'celery', 'sidekiq', 'background jobs', 'worker'], domain: 'backend' },
  { patterns: ['gin', 'fiber', 'echo', 'actix', 'axum', 'rocket', 'rust', 'go', 'golang', 'java', 'kotlin', 'scala', 'php'], domain: 'backend' },

  // ── Database ──
  { patterns: ['postgres', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'sql server', 'mssql', 'oracle db'], domain: 'database' },
  { patterns: ['mongodb', 'mongo', 'cassandra', 'dynamodb', 'dynamo', 'couchdb', 'cosmos db', 'firebase', 'supabase', 'planetscale'], domain: 'database' },
  { patterns: ['redis', 'memcached', 'elasticsearch', 'opensearch', 'solr', 'neo4j', 'arangodb', 'influxdb', 'timescaledb'], domain: 'database' },
  { patterns: ['sql', 'nosql', 'orm', 'prisma', 'sequelize', 'typeorm', 'mongoose', 'sqlalchemy', 'hibernate', 'knex'], domain: 'database' },
  { patterns: ['database design', 'data modeling', 'etl', 'data warehouse', 'data lake'], domain: 'database' },

  // ── DevOps ──
  { patterns: ['docker', 'dockerfile', 'docker-compose', 'container', 'containers', 'kubernetes', 'k8s', 'helm'], domain: 'devops' },
  { patterns: ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'gitlab ci', 'github actions', 'circleci', 'travis', 'bitbucket pipeline'], domain: 'devops' },
  { patterns: ['terraform', 'ansible', 'puppet', 'chef', 'pulumi', 'cloudformation', 'infrastructure as code', 'iac'], domain: 'devops' },
  { patterns: ['nginx', 'apache', 'caddy', 'load balancer', 'reverse proxy', 'haproxy'], domain: 'devops' },
  { patterns: ['monitoring', 'prometheus', 'grafana', 'datadog', 'new relic', 'splunk', 'logging', 'observability', 'sentry', 'opentelemetry'], domain: 'devops' },

  // ── Cloud ──
  { patterns: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'ecs', 'eks', 'sqs', 'sns', 'cloudfront', 'rds', 'aurora'], domain: 'cloud' },
  { patterns: ['azure', 'azure devops', 'app service', 'azure functions', 'cosmos db', 'azure ad', 'bicep'], domain: 'cloud' },
  { patterns: ['gcp', 'google cloud', 'cloud run', 'cloud functions', 'bigquery', 'cloud storage', 'cloud sql', 'firebase', 'vertex ai'], domain: 'cloud' },
  { patterns: ['vercel', 'netlify', 'cloudflare', 'heroku', 'railway', 'render', 'digitalocean', 'fly.io', 'docker hub'], domain: 'cloud' },

  // ── AI / ML ──
  { patterns: ['machine learning', 'ml', 'deep learning', 'neural network', 'nlp', 'natural language', 'computer vision', 'cv'], domain: 'aiml' },
  { patterns: ['tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'xgboost', 'lightgbm', 'hugging face', 'huggingface', 'transformers'], domain: 'aiml' },
  { patterns: ['openai', 'gpt', 'llm', 'large language model', 'langchain', 'llamaindex', 'rag', 'retrieval augmented', 'prompt engineering', 'chatgpt', 'copilot'], domain: 'aiml' },
  { patterns: ['pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'jupyter', 'notebook', 'data science', 'data analysis', 'statistics'], domain: 'aiml' },
  { patterns: ['stable diffusion', 'midjourney', 'image generation', 'generative ai', 'gen ai', 'diffusion model', 'embedding', 'vector database', 'pinecone', 'weaviate', 'chroma', 'faiss', 'milvus'], domain: 'aiml' },

  // ── Testing ──
  { patterns: ['jest', 'mocha', 'vitest', 'jasmine', 'karma', 'chai', 'enzyme'], domain: 'testing' },
  { patterns: ['pytest', 'unittest', 'nose', 'tox', 'coverage.py', 'behave', 'robot framework'], domain: 'testing' },
  { patterns: ['cypress', 'playwright', 'selenium', 'puppeteer', 'webdriver', 'appium', 'detox', 'maestro'], domain: 'testing' },
  { patterns: ['testing', 'test', 'tdd', 'bdd', 'unit test', 'integration test', 'e2e', 'end to end', 'test driven', 'mock', 'stub', 'test coverage'], domain: 'testing' },
  { patterns: ['postman', 'insomnia', 'api testing', 'load testing', 'jmeter', 'k6', 'gatling', 'stress test', 'performance testing'], domain: 'testing' },

  // ── Tools ──
  { patterns: ['git', 'github', 'gitlab', 'bitbucket', 'svn', 'version control'], domain: 'tools' },
  { patterns: ['linux', 'unix', 'bash', 'shell', 'powershell', 'zsh', 'command line', 'terminal', 'cli'], domain: 'tools' },
  { patterns: ['vscode', 'visual studio code', 'intellij', 'vim', 'neovim', 'emacs', 'webstorm', 'pycharm', 'ide'], domain: 'tools' },
  { patterns: ['npm', 'yarn', 'pnpm', 'pip', 'poetry', 'pdm', 'conda', 'maven', 'gradle', 'nuget', 'composer'], domain: 'tools' },
  { patterns: ['eslint', 'prettier', 'black', 'ruff', 'rubocop', 'sonarqube', 'lint', 'format'], domain: 'tools' },
  { patterns: ['agile', 'scrum', 'kanban', 'jira', 'trello', 'asana', 'linear', 'notion', 'confluence', 'project management'], domain: 'tools' },

  // ── Languages (programming) ──
  { patterns: ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'dart', 'lua', 'perl', 'haskell', 'elixir', 'clojure', 'f#', 'fortran', 'cobol', 'assembly', 'asm', 'sql'], domain: 'languages' },

  // ── Soft Skills ──
  { patterns: ['leadership', 'communication', 'teamwork', 'team lead', 'mentoring', 'mentoring', 'collaboration', 'problem solving', 'critical thinking', 'time management', 'adaptability', 'creativity', 'presentation', 'negotiation', 'stakeholder', 'cross-functional', 'self-motivated', 'detail-oriented', 'analytical', 'strategic'], domain: 'soft' },
]

/**
 * Categorise a flat list of detected skills into domain buckets.
 *
 * Each skill string is matched case-insensitively against the keyword map.
 * A skill can appear in at most one domain (first match wins). Unknown
 * skills are silently skipped.
 *
 * @returns A map from domain key → Set of matched skill names.
 */
export function categoriseSkills(skills: string[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const domain of SKILL_DOMAINS) {
    result.set(domain.key, new Set())
  }

  for (const raw of skills) {
    const skill = raw.toLowerCase().trim()
    if (!skill) continue

    for (const entry of SKILL_KEYWORD_MAP) {
      if (entry.patterns.some((p) => skill === p || skill.includes(p) || p.includes(skill))) {
        result.get(entry.domain)?.add(raw)
        break // first match only
      }
    }
  }

  return result
}

// ── Radar geometry ───────────────────────────────────────────────────────────

export interface RadarPoint {
  x: number
  y: number
}

/**
 * Convert polar (angle, radius) to cartesian (x, y).
 * Angle 0 = top (−Y), increasing clockwise.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  angleDeg: number,
  radius: number,
): RadarPoint {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

/**
 * Build the SVG polygon points string for a radar data polygon.
 *
 * @param values   Normalised values (0–1) in domain order.
 * @param cx       Centre X of the chart.
 * @param cy       Centre Y of the chart.
 * @param maxRadius  Maximum radius of the chart.
 * @returns An array of polygon vertices (one per domain).
 */
export function buildRadarPolygon(
  values: number[],
  cx: number,
  cy: number,
  maxRadius: number,
): RadarPoint[] {
  const n = values.length
  if (n === 0) return []
  const step = 360 / n
  return values.map((v, i) => {
    const clamped = Math.max(0, Math.min(1, v))
    return polarToCartesian(cx, cy, step * i, clamped * maxRadius)
  })
}

/**
 * Build concentric guide rings (20 %, 40 %, 60 %, 80 %, 100 %).
 */
export function buildRadarRings(
  cx: number,
  cy: number,
  maxRadius: number,
  levels: number = 5,
): RadarPoint[][] {
  const rings: RadarPoint[][] = []
  for (let l = 1; l <= levels; l++) {
    const r = (l / levels) * maxRadius
    const step = 360 / SKILL_DOMAINS.length
    const ring: RadarPoint[] = SKILL_DOMAINS.map((_, i) =>
      polarToCartesian(cx, cy, step * i, r),
    )
    rings.push(ring)
  }
  return rings
}

/**
 * Build axis lines from centre to each vertex.
 */
export function buildRadarAxes(
  cx: number,
  cy: number,
  maxRadius: number,
): Array<{ from: RadarPoint; to: RadarPoint }> {
  const step = 360 / SKILL_DOMAINS.length
  return SKILL_DOMAINS.map((_, i) => ({
    from: { x: cx, y: cy },
    to: polarToCartesian(cx, cy, step * i, maxRadius),
  }))
}

/** Convert polygon vertices to an SVG `points` attribute string. */
export function verticesToPoints(pts: RadarPoint[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

/**
 * Compute a summary score for how well the detected skills cover the domains.
 *
 * Returns 0–100 where 100 = every domain has at least one skill.
 */
export function domainCoverageScore(domainCounts: Map<string, Set<string>>): number {
  const total = SKILL_DOMAINS.length
  if (total === 0) return 0
  let covered = 0
  for (const domain of SKILL_DOMAINS) {
    if ((domainCounts.get(domain.key)?.size ?? 0) > 0) covered++
  }
  return Math.round((covered / total) * 100)
}

/**
 * Determine the "strongest" and "weakest" domains from the normalised values.
 */
export function domainExtremes(
  normalisedValues: number[],
): { strongest: number; weakest: number } {
  let strongest = 0
  let weakest = 0
  let maxVal = -1
  let minVal = 2
  normalisedValues.forEach((v, i) => {
    if (v > maxVal) { maxVal = v; strongest = i }
    if (v < minVal) { minVal = v; weakest = i }
  })
  return { strongest, weakest }
}
