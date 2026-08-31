import React, { useState } from 'react'
import axios from 'axios'
import { Map, Briefcase, ChevronDown, ChevronUp, ExternalLink, Star } from 'lucide-react'
import './Roadmap.css'

interface RoadmapNode {
    id: string
    title: string
    type: string
    duration: string
    desc: string
}

interface Course {
    id: string
    title: string
    platform: string
    difficulty: string
    rating: number
}

const CourseDrawer = ({ skillTitle }: { skillTitle: string }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(false)

    const fetchCourses = async () => {
        if (!isOpen && courses.length === 0) {
            setLoading(true)
            try {
                const token = localStorage.getItem('token')
                const res = await axios.get(`http://127.0.0.1:8000/analyzer/api/roadmap/courses/?skill=${encodeURIComponent(skillTitle)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setCourses(res.data.courses || [])
            } catch (error) {
                console.error("Failed to fetch courses", error)
            } finally {
                setLoading(false)
            }
        }
        setIsOpen(!isOpen)
    }

    return (
        <div className="course-drawer">
            <button className="drawer-btn" onClick={fetchCourses}>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isOpen ? 'Hide Resources' : 'View Recommended Courses'}
            </button>

            {isOpen && (
                <div className="courses-list">
                    {loading ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Analyzing suitable paths...</div>
                    ) : (
                        courses.map(course => (
                            <div key={course.id} className="course-item">
                                <div>
                                    <div className="course-title">{course.title}</div>
                                    <div className="course-platform">{course.platform} • {course.difficulty}</div>
                                </div>
                                <div className="course-stats">
                                    <span className="stat-pill"><Star size={12} style={{ marginRight: 4, color: '#fbbf24' }} />{course.rating.toFixed(1)}</span>
                                    <a href="#" style={{ color: '#8b5cf6' }}><ExternalLink size={16} /></a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export const CareerRoadmap = () => {
    const [currentRole, setCurrentRole] = useState('')
    const [targetRole, setTargetRole] = useState('')
    const [roadmap, setRoadmap] = useState<RoadmapNode[]>([])
    const [loading, setLoading] = useState(false)

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!targetRole) return

        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await axios.post('http://127.0.0.1:8000/analyzer/api/roadmap/generate/',
                { current_role: currentRole, target_role: targetRole },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setRoadmap(res.data.roadmap_nodes || [])
        } catch (error) {
            console.error("Error generating roadmap:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh' }}>
            <div className="roadmap-container">
                <div className="roadmap-header">
                    <Map size={48} style={{ color: '#8b5cf6', margin: '0 auto 1rem' }} />
                    <h1>AI Career Progression Roadmap</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                        Generate a chronological skill tree mapping exactly what you need to learn to bridge the gap between your current position and your dream tech role.
                    </p>
                </div>

                <form className="roadmap-form" onSubmit={handleGenerate}>
                    <input
                        type="text"
                        placeholder="Current Role (e.g. Junior Dev)"
                        className="roadmap-input"
                        value={currentRole}
                        onChange={(e) => setCurrentRole(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Target Role (e.g. Frontend Master)"
                        className="roadmap-input"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        required
                    />
                    <button type="submit" className="roadmap-btn" disabled={loading}>
                        {loading ? 'Mapping Path...' : 'Generate Roadmap'}
                    </button>
                </form>

                {roadmap.length > 0 && (
                    <div className="roadmap-timeline">
                        {roadmap.map((node, idx) => (
                            <div key={node.id} className="roadmap-node" style={{ animationDelay: `${idx * 0.2}s` }}>
                                <div className="node-marker"></div>
                                <div className="node-content">
                                    <h3 className="node-title">{node.title}</h3>
                                    <div className="node-meta">
                                        <span className="badge-type">{node.type}</span>
                                        <span className="badge-duration">{node.duration}</span>
                                    </div>
                                    <p className="node-desc">{node.desc}</p>

                                    <CourseDrawer skillTitle={node.title} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
