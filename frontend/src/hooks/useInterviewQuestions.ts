/**
 * Custom React hook to manage question state, API fetching, and user progress tracking.
 */
import { useState } from 'react';
import api from '../api/client';

export interface InterviewQuestion {
    id: string; // Added for React key and local state tracking
    category: string;
    difficulty: string;
    question: string;
    guidelines: string;
    is_practiced: boolean;
    is_saved: boolean;
}

export interface InterviewData {
    questions: InterviewQuestion[];
    total_questions: number;
    categories: string[];
}

export const useInterviewQuestions = () => {
    const [data, setData] = useState<InterviewData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const generateQuestions = async (resumeText: string, skills: string[], jobDescription: string) => {
        if (!resumeText || !jobDescription) {
            setError("Resume text and job description are required to generate questions.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post<InterviewData>('/api/analyzer/generate-interview-questions/', {
                resume_text: resumeText,
                skills: skills,
                job_description: jobDescription,
            });

            // Add unique IDs to questions for local state management and React keys
            const questionsWithIds = response.data.questions.map((q, index) => ({
                ...q,
                id: `q_${index}_${Date.now()}`,
            }));

            const newData = {
                ...response.data,
                questions: questionsWithIds,
            };

            setData(newData);

            // Load any previously saved progress for these specific questions
            loadProgress(newData.questions);

        } catch (err) {
            console.error('Failed to generate interview questions:', err);
            setError('Failed to generate questions. Please check your inputs and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const updateQuestionState = (id: string, updates: Partial<InterviewQuestion>) => {
        if (!data) return;

        const updatedQuestions = data.questions.map(q =>
            q.id === id ? { ...q, ...updates } : q
        );

        const newData = {
            ...data,
            questions: updatedQuestions,
        };

        setData(newData);

        // Persist progress to localStorage
        const progressToSave = updatedQuestions.map(({ id, question, is_practiced, is_saved }) => ({
            question, is_practiced, is_saved
        }));
        localStorage.setItem('interview_progress', JSON.stringify(progressToSave));
    };

    const loadProgress = (currentQuestions: InterviewQuestion[]) => {
        const savedProgress = localStorage.getItem('interview_progress');
        if (savedProgress) {
            try {
                const parsed = JSON.parse(savedProgress) as { question: string, is_practiced: boolean, is_saved: boolean }[];

                const mergedQuestions = currentQuestions.map(q => {
                    const savedQ = parsed.find(sq => sq.question === q.question);
                    return savedQ ? { ...q, is_practiced: savedQ.is_practiced, is_saved: savedQ.is_saved } : q;
                });

                setData(prev => prev ? { ...prev, questions: mergedQuestions } : null);
            } catch (e) {
                console.error('Failed to parse saved interview progress:', e);
            }
        }
    };

    return {
        data,
        isLoading,
        error,
        generateQuestions,
        updateQuestionState,
    };
};
