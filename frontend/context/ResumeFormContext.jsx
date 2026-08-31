// src/context/ResumeFormContext.jsx

import React, { createContext, useContext, useState } from 'react';

const ResumeFormContext = createContext(null);

export function ResumeFormProvider({ children }) {
    const [careerTrack, setCareerTrack] = useState('Frontend Developer');
    const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
    const [jobDescription, setJobDescription] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);

    const resetForm = () => {
        setJobDescription('');
        setUploadedFile(null);
    };

    return (
        <ResumeFormContext.Provider value={{
            careerTrack,
            setCareerTrack,
            experienceLevel,
            setExperienceLevel,
            jobDescription,
            setJobDescription,
            uploadedFile,
            setUploadedFile,
            resetForm,
        }}>
            {children}
        </ResumeFormContext.Provider>
    );
}

export function useResumeForm() {
    const context = useContext(ResumeFormContext);
    if (!context) {
        throw new Error('useResumeForm must be used within a ResumeFormProvider');
    }
    return context;
}
