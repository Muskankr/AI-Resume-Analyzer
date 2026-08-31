import React from 'react';
import type {
  InterviewQuestion, PracticeSession, InterviewCompanyProfile, STARStory
} from './interviewPrepTypes';
import {
  DIFFICULTY_COLORS, CATEGORY_COLORS, CATEGORY_ICONS, ROUND_COLORS,
  STATUS_COLORS, COMPANY_TYPE_ICONS, STAR_COLORS, formatTime, getScoreColor
} from './interviewPrepTypes';

interface StatCardProps { label: string; value: string | number; icon: string; color: string; subtitle?: string; }
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subtitle }) => (
  <div style={{ background: '#1e1e2e', borderRadius: 12, padding: '20px 16px', borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    {subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
  </div>
);

interface QuestionCardProps { question: InterviewQuestion; onClick?: () => void; }
export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onClick }) => (
  <div onClick={onClick} style={{ background: '#1e1e2e', borderRadius: 12, padding: 16, borderLeft: `4px solid ${CATEGORY_COLORS[question.category]}`, cursor: onClick ? 'pointer' : 'default' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{CATEGORY_ICONS[question.category]}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{question.category.replace(/_/g, ' ')}</span>
      </div>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${DIFFICULTY_COLORS[question.difficulty]}20`, color: DIFFICULTY_COLORS[question.difficulty], fontWeight: 600 }}>{question.difficulty}</span>
    </div>
    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 10px', lineHeight: 1.5 }}>{question.text}</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
      <span style={{ padding: '2px 6px', borderRadius: 6, background: `${ROUND_COLORS[question.round]}20`, color: ROUND_COLORS[question.round] }}>{question.round.replace(/_/g, ' ')}</span>
      <span>{COMPANY_TYPE_ICONS[question.companyType]} {question.company}</span>
      <span>🔥 {question.frequency}% frequency</span>
      <span>👍 {question.upvotes}</span>
    </div>
    {question.resumeReference && (
      <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>📄 References: {question.resumeReference}</div>
    )}
  </div>
);

interface SessionCardProps { session: PracticeSession; }
export const SessionCard: React.FC<SessionCardProps> = ({ session }) => (
  <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 16, borderLeft: `4px solid ${STATUS_COLORS[session.status]}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${DIFFICULTY_COLORS[session.difficulty]}20`, color: DIFFICULTY_COLORS[session.difficulty], fontWeight: 600 }}>{session.difficulty}</span>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${STATUS_COLORS[session.status]}20`, color: STATUS_COLORS[session.status], fontWeight: 600 }}>{session.status}</span>
    </div>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 8px', lineHeight: 1.4 }}>{session.questionText.slice(0, 80)}...</p>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
      <span>⏱️ {formatTime(session.timeTaken)}</span>
      <span>🔄 {session.attempts} attempt{session.attempts !== 1 ? 's' : ''}</span>
      {session.score !== undefined && <span style={{ color: getScoreColor(session.score), fontWeight: 600 }}>⭐ {session.score}%</span>}
    </div>
  </div>
);

interface CompanyCardProps { profile: InterviewCompanyProfile; }
export const CompanyCard: React.FC<CompanyCardProps> = ({ profile }) => (
  <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 16, borderLeft: `4px solid ${DIFFICULTY_COLORS[profile.avgDifficulty]}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 28 }}>{profile.logo}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{profile.name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{COMPANY_TYPE_ICONS[profile.type]} {profile.type}</div>
      </div>
    </div>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.4 }}>{profile.cultureNotes}</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
      <span>📊 {profile.questionBank} questions</span>
      <span>🎯 {profile.successRate}% success rate</span>
      <span>📈 Avg: {profile.avgDifficulty}</span>
    </div>
    {profile.prepTips.map((tip, i) => (
      <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>💡 {tip}</div>
    ))}
  </div>
);

interface STARCardProps { story: STARStory; }
export const STARCard: React.FC<STARCardProps> = ({ story }) => (
  <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 16, borderLeft: '4px solid #6366f1' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{story.title}</span>
      <span style={{ color: '#f59e0b', fontSize: 12 }}>⭐ {story.rating}/5</span>
    </div>
    {(['SITUATION', 'TASK', 'ACTION', 'RESULT'] as const).map(comp => (
      <div key={comp} style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: STAR_COLORS[comp], marginBottom: 2 }}>{comp}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, paddingLeft: 8 }}>{story[comp.toLowerCase() as keyof STARStory] as string}</div>
      </div>
    ))}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {story.skillsDemonstrated.map(s => (
        <span key={s} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2d2d3f', color: '#a78bfa' }}>{s}</span>
      ))}
    </div>
  </div>
);

interface StreakCardProps { streak: { currentStreak: number; longestStreak: number; totalPracticeDays: number; totalSessions: number; avgScore: number; bestScore: number }; }
export const StreakCard: React.FC<StreakCardProps> = ({ streak }) => (
  <div style={{ background: 'linear-gradient(135deg, #6366f120, #f59e0b20)', borderRadius: 12, padding: 20, border: '1px solid #6366f140' }}>
    <div style={{ textAlign: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 40 }}>🔥</span>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b' }}>{streak.currentStreak} days</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Current Streak</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
      <div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{streak.longestStreak}</div>Best Streak</div>
      <div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{streak.totalSessions}</div>Total Sessions</div>
      <div><div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{streak.avgScore}%</div>Avg Score</div>
    </div>
  </div>
);
