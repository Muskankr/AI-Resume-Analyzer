/**
 * Career Track Manager Service
 * 
 * Provides live CRUD management for career track definitions and associated skill sets.
 * Admin users can create, edit, or delete tracks and assign required vs optional skills,
 * updating resume scoring and leaderboard calculations dynamically without redeploying.
 */

export interface CareerTrackDefinition {
  id: string
  name: string
  icon: string
  description: string
  requiredSkills: string[]
  optionalSkills: string[]
  targetExperienceYears: number
  minScoreThreshold: number
  isCustom?: boolean
  updatedAt: string
}

export const INITIAL_CAREER_TRACKS: CareerTrackDefinition[] = [
  {
    id: 'track-frontend',
    name: 'Frontend Developer',
    icon: '🎨',
    description: 'Focuses on user interface, web performance, and client-side web application development.',
    requiredSkills: ['React.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3'],
    optionalSkills: ['Next.js', 'TailwindCSS', 'Redux', 'Jest', 'Webpack', 'Figma'],
    targetExperienceYears: 3,
    minScoreThreshold: 75,
    updatedAt: '2026-08-01',
  },
  {
    id: 'track-backend',
    name: 'Backend Developer',
    icon: '⚙️',
    description: 'Builds server-side logic, API endpoints, microservices, and database systems.',
    requiredSkills: ['Python', 'Node.js', 'PostgreSQL', 'REST APIs', 'Docker'],
    optionalSkills: ['Redis', 'GraphQL', 'Kubernetes', 'MongoDB', 'AWS', 'Microservices'],
    targetExperienceYears: 3,
    minScoreThreshold: 75,
    updatedAt: '2026-08-01',
  },
  {
    id: 'track-data-analyst',
    name: 'Data Analyst',
    icon: '📊',
    description: 'Analyzes complex datasets, generates insights, and builds business intelligence dashboards.',
    requiredSkills: ['SQL', 'Python', 'Pandas', 'Data Visualization', 'Excel'],
    optionalSkills: ['Tableau', 'Power BI', 'BigQuery', 'R', 'Statistics'],
    targetExperienceYears: 2,
    minScoreThreshold: 70,
    updatedAt: '2026-08-01',
  },
  {
    id: 'track-devops',
    name: 'DevOps Engineer',
    icon: '🚀',
    description: 'Manages CI/CD pipelines, cloud infrastructure, container orchestration, and system reliability.',
    requiredSkills: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux'],
    optionalSkills: ['AWS', 'GCP', 'Ansible', 'Prometheus', 'Grafana', 'Bash'],
    targetExperienceYears: 4,
    minScoreThreshold: 80,
    updatedAt: '2026-08-01',
  },
]

const STORAGE_KEY = 'ai_resume_analyzer_career_tracks_v1'
type Listener = () => void

class CareerTrackManager {
  private tracks: Map<string, CareerTrackDefinition> = new Map()
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.loadInitialData()
  }

  private loadInitialData(): void {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (stored) {
        const parsed: CareerTrackDefinition[] = JSON.parse(stored)
        parsed.forEach((t) => this.tracks.set(t.id, t))
      } else {
        INITIAL_CAREER_TRACKS.forEach((t) => this.tracks.set(t.id, t))
      }
    } catch {
      INITIAL_CAREER_TRACKS.forEach((t) => this.tracks.set(t.id, t))
    }
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.tracks.values())))
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

  public getTracks(): CareerTrackDefinition[] {
    return Array.from(this.tracks.values())
  }

  public getTrackById(id: string): CareerTrackDefinition | undefined {
    return this.tracks.get(id)
  }

  public getTrackByName(name: string): CareerTrackDefinition | undefined {
    return this.getTracks().find((t) => t.name.toLowerCase() === name.toLowerCase())
  }

  public addTrack(
    entry: Omit<CareerTrackDefinition, 'id' | 'updatedAt'>
  ): CareerTrackDefinition {
    const id = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newTrack: CareerTrackDefinition = {
      ...entry,
      id,
      isCustom: true,
      updatedAt: new Date().toISOString().split('T')[0],
    }
    this.tracks.set(id, newTrack)
    this.persist()
    this.notify()
    return newTrack
  }

  public updateTrack(
    id: string,
    updates: Partial<Omit<CareerTrackDefinition, 'id'>>
  ): CareerTrackDefinition {
    const existing = this.tracks.get(id)
    if (!existing) {
      throw new Error(`Career track with ID "${id}" not found.`)
    }
    const updated: CareerTrackDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    }
    this.tracks.set(id, updated)
    this.persist()
    this.notify()
    return updated
  }

  public deleteTrack(id: string): boolean {
    const result = this.tracks.delete(id)
    if (result) {
      this.persist()
      this.notify()
    }
    return result
  }

  public resetToDefaults(): void {
    this.tracks.clear()
    INITIAL_CAREER_TRACKS.forEach((t) => this.tracks.set(t.id, t))
    this.persist()
    this.notify()
  }

  /** Calculate readiness match percentage for a user's detected skills against a track */
  public calculateTrackMatch(
    trackId: string,
    userSkills: string[]
  ): { score: number; missingRequired: string[]; matchedRequired: string[] } {
    const track = this.getTrackById(trackId)
    if (!track || track.requiredSkills.length === 0) {
      return { score: 0, missingRequired: [], matchedRequired: [] }
    }

    const normalizedUserSkills = userSkills.map((s) => s.toLowerCase())
    const matchedRequired: string[] = []
    const missingRequired: string[] = []

    track.requiredSkills.forEach((req) => {
      if (normalizedUserSkills.includes(req.toLowerCase())) {
        matchedRequired.push(req)
      } else {
        missingRequired.push(req)
      }
    })

    const score = Math.round((matchedRequired.length / track.requiredSkills.length) * 100)
    return { score, missingRequired, matchedRequired }
  }
}

export const careerTrackManager = new CareerTrackManager()
