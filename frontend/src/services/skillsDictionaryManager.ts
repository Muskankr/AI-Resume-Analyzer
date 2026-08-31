/**
 * Skills Dictionary Manager Service
 * 
 * Provides live CRUD management for the resume skills dictionary and skill categories.
 * Allows administrators and maintainers to modify detected skills, patterns, categories,
 * and market demand metrics in real-time without requiring a application redeployment.
 */

export interface SkillCategory {
  id: string
  label: string
  icon: string
  color: string
  description?: string
}

export interface SkillDictionaryEntry {
  id: string
  name: string
  category: string
  patterns: string[]
  description: string
  demandScore: number // 1 - 100
  isCustom?: boolean
  updatedAt: string
}

export const INITIAL_SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'frontend', label: 'Frontend Development', icon: '🎨', color: '#6366f1' },
  { id: 'backend', label: 'Backend Development', icon: '⚙️', color: '#22c55e' },
  { id: 'database', label: 'Databases & Storage', icon: '🗄️', color: '#f59e0b' },
  { id: 'devops', label: 'DevOps & CI/CD', icon: '🚀', color: '#ef4444' },
  { id: 'cloud', label: 'Cloud Infrastructure', icon: '☁️', color: '#06b6d4' },
  { id: 'aiml', label: 'AI, ML & Data Science', icon: '🤖', color: '#a855f7' },
  { id: 'testing', label: 'Testing & QA', icon: '🧪', color: '#ec4899' },
  { id: 'tools', label: 'Tools & Workflows', icon: '🔧', color: '#14b8a6' },
]

export const INITIAL_SKILL_ENTRIES: SkillDictionaryEntry[] = [
  {
    id: 'skill-react',
    name: 'React.js',
    category: 'frontend',
    patterns: ['react', 'reactjs', 'react.js', 'jsx'],
    description: 'Component-based UI library for web and mobile web apps.',
    demandScore: 95,
    updatedAt: '2026-08-01',
  },
  {
    id: 'skill-typescript',
    name: 'TypeScript',
    category: 'frontend',
    patterns: ['typescript', 'ts', 'tsx'],
    description: 'Typed superset of JavaScript that compiles to plain JS.',
    demandScore: 92,
    updatedAt: '2026-08-01',
  },
  {
    id: 'skill-python',
    name: 'Python',
    category: 'backend',
    patterns: ['python', 'python3', 'py'],
    description: 'High-level programming language widely used in AI, ML, and web servers.',
    demandScore: 98,
    updatedAt: '2026-08-01',
  },
  {
    id: 'skill-docker',
    name: 'Docker',
    category: 'devops',
    patterns: ['docker', 'dockerfile', 'docker-compose', 'containerization'],
    description: 'OS-level virtualization platform to deliver software in packages.',
    demandScore: 88,
    updatedAt: '2026-08-01',
  },
  {
    id: 'skill-postgresql',
    name: 'PostgreSQL',
    category: 'database',
    patterns: ['postgres', 'postgresql', 'psql'],
    description: 'Powerful, open-source object-relational database system.',
    demandScore: 90,
    updatedAt: '2026-08-01',
  },
  {
    id: 'skill-aws',
    name: 'Amazon Web Services (AWS)',
    category: 'cloud',
    patterns: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'],
    description: 'Comprehensive cloud computing platform provided by Amazon.',
    demandScore: 94,
    updatedAt: '2026-08-01',
  },
]

const SKILLS_STORAGE_KEY = 'ai_resume_analyzer_skills_dictionary_v1'
const CATEGORIES_STORAGE_KEY = 'ai_resume_analyzer_skill_categories_v1'

type Listener = () => void

class SkillsDictionaryManager {
  private skills: Map<string, SkillDictionaryEntry> = new Map()
  private categories: Map<string, SkillCategory> = new Map()
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.loadInitialData()
  }

  private loadInitialData(): void {
    // Load Categories
    try {
      const storedCategories = typeof window !== 'undefined' ? localStorage.getItem(CATEGORIES_STORAGE_KEY) : null
      if (storedCategories) {
        const parsed: SkillCategory[] = JSON.parse(storedCategories)
        parsed.forEach((cat) => this.categories.set(cat.id, cat))
      } else {
        INITIAL_SKILL_CATEGORIES.forEach((cat) => this.categories.set(cat.id, cat))
      }
    } catch {
      INITIAL_SKILL_CATEGORIES.forEach((cat) => this.categories.set(cat.id, cat))
    }

    // Load Skills
    try {
      const storedSkills = typeof window !== 'undefined' ? localStorage.getItem(SKILLS_STORAGE_KEY) : null
      if (storedSkills) {
        const parsed: SkillDictionaryEntry[] = JSON.parse(storedSkills)
        parsed.forEach((skill) => this.skills.set(skill.id, skill))
      } else {
        INITIAL_SKILL_ENTRIES.forEach((skill) => this.skills.set(skill.id, skill))
      }
    } catch {
      INITIAL_SKILL_ENTRIES.forEach((skill) => this.skills.set(skill.id, skill))
    }
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(Array.from(this.skills.values())))
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(Array.from(this.categories.values())))
    } catch {
      // Storage error ignored
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public getSkills(): SkillDictionaryEntry[] {
    return Array.from(this.skills.values())
  }

  public getSkillById(id: string): SkillDictionaryEntry | undefined {
    return this.skills.get(id)
  }

  public getCategories(): SkillCategory[] {
    return Array.from(this.categories.values())
  }

  public addSkill(entry: Omit<SkillDictionaryEntry, 'id' | 'updatedAt'>): SkillDictionaryEntry {
    const id = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newEntry: SkillDictionaryEntry = {
      ...entry,
      id,
      isCustom: true,
      updatedAt: new Date().toISOString().split('T')[0],
    }
    this.skills.set(id, newEntry)
    this.persist()
    this.notify()
    return newEntry
  }

  public updateSkill(id: string, updates: Partial<Omit<SkillDictionaryEntry, 'id'>>): SkillDictionaryEntry {
    const existing = this.skills.get(id)
    if (!existing) {
      throw new Error(`Skill with ID "${id}" not found.`)
    }
    const updated: SkillDictionaryEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    }
    this.skills.set(id, updated)
    this.persist()
    this.notify()
    return updated
  }

  public deleteSkill(id: string): boolean {
    const result = this.skills.delete(id)
    if (result) {
      this.persist()
      this.notify()
    }
    return result
  }

  public addCategory(category: SkillCategory): void {
    this.categories.set(category.id, category)
    this.persist()
    this.notify()
  }

  public searchSkills(query: string, categoryId?: string): SkillDictionaryEntry[] {
    const q = query.toLowerCase().trim()
    return this.getSkills().filter((skill) => {
      const matchesCategory = !categoryId || categoryId === 'all' || skill.category === categoryId
      const matchesQuery =
        !q ||
        skill.name.toLowerCase().includes(q) ||
        skill.patterns.some((p) => p.toLowerCase().includes(q)) ||
        skill.description.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }

  public resetToDefaults(): void {
    this.skills.clear()
    this.categories.clear()
    INITIAL_SKILL_CATEGORIES.forEach((cat) => this.categories.set(cat.id, cat))
    INITIAL_SKILL_ENTRIES.forEach((skill) => this.skills.set(skill.id, skill))
    this.persist()
    this.notify()
  }
}

export const skillsDictionaryManager = new SkillsDictionaryManager()
