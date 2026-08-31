// src/components/CareerTrackSelector.jsx

import React from 'react';
import { useUserPreferences } from '../hooks/useUserPreferences';

export default function CareerTrackSelector({ currentUser }) {
    const { careerTrack, experienceLevel, savePreferences } = useUserPreferences(currentUser);

    const tracks = ['Frontend Developer', 'Backend Developer', 'Full Stack Engineer', 'Data Scientist', 'AI/ML Engineer'];
    const levels = ['Entry-Level', 'Mid-Level', 'Senior', 'Lead / Principal'];

    const handleTrackChange = (e) => {
        savePreferences(e.target.value, experienceLevel);
    };

    const handleLevelChange = (e) => {
        savePreferences(careerTrack, e.target.value);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Resume Analysis Settings</h3>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Career Track</label>
                <select 
                    value={careerTrack} 
                    onChange={handleTrackChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                    {tracks.map(track => (
                        <option key={track} value={track}>{track}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                <select 
                    value={experienceLevel} 
                    onChange={handleLevelChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                    {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
            </div>

            <p className="text-xs text-gray-500 italic">
                Your last-used selections are automatically saved for your next visit.
            </p>
        </div>
    );
}
