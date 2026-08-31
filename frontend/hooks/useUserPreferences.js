// src/hooks/useUserPreferences.js

import { useState, useEffect } from 'react';

const STORAGE_KEY_TRACK = 'ai_resume_last_career_track';
const STORAGE_KEY_LEVEL = 'ai_resume_last_experience_level';

const DEFAULT_TRACK = 'Frontend Developer';
const DEFAULT_LEVEL = 'Mid-Level';

export function useUserPreferences(user = null) {
    const [careerTrack, setCareerTrack] = useState(() => {
        return localStorage.getItem(STORAGE_KEY_TRACK) || DEFAULT_TRACK;
    });

    const [experienceLevel, setExperienceLevel] = useState(() => {
        return localStorage.getItem(STORAGE_KEY_LEVEL) || DEFAULT_LEVEL;
    });

    // Synchronize or fetch account-based preferences if user is logged in
    useEffect(() => {
        if (user && user.preferences) {
            if (user.preferences.careerTrack) {
                setCareerTrack(user.preferences.careerTrack);
            }
            if (user.preferences.experienceLevel) {
                setExperienceLevel(user.preferences.experienceLevel);
            }
        }
    }, [user]);

    const savePreferences = async (newTrack, newLevel) => {
        setCareerTrack(newTrack);
        setExperienceLevel(newLevel);

        // Always save to localStorage for fallback/anonymous users
        localStorage.setItem(STORAGE_KEY_TRACK, newTrack);
        localStorage.setItem(STORAGE_KEY_LEVEL, newLevel);

        // If user is logged in, sync with backend API
        if (user && user.id) {
            try {
                await fetch('/api/user/preferences', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ careerTrack: newTrack, experienceLevel: newLevel }),
                });
            } catch (err) {
                console.error('Failed to sync user preferences to account:', err);
            }
        }
    };

    return {
        careerTrack,
        experienceLevel,
        savePreferences,
    };
}
