// src/components/ResumeAnalyzerForm.jsx

import React from 'react';
import { useResumeForm } from '../context/ResumeFormContext';

export default function ResumeAnalyzerForm() {
    const {
        careerTrack,
        setCareerTrack,
        experienceLevel,
        setExperienceLevel,
        jobDescription,
        setJobDescription,
        uploadedFile,
        setUploadedFile,
        resetForm,
    } = useResumeForm();

    const tracks = ['Frontend Developer', 'Backend Developer', 'Full Stack Engineer', 'Data Scientist', 'AI/ML Engineer'];
    const levels = ['Entry-Level', 'Mid-Level', 'Senior', 'Lead / Principal'];

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">Resume & Job Match Analyzer</h2>
                <button 
                    type="button" 
                    onClick={resetForm}
                    className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                    Reset Form
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Career Track</label>
                    <select 
                        value={careerTrack} 
                        onChange={(e) => setCareerTrack(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        {tracks.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                    <select 
                        value={experienceLevel} 
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        {levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume (PDF / DOCX)</label>
                <input 
                    type="file" 
                    accept=".pdf,.docx,.doc" 
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadedFile && (
                    <p className="mt-2 text-xs text-green-600 font-medium">
                        ✓ Selected file: {uploadedFile.name}
                    </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                <textarea 
                    rows="5"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500"
                ></textarea>
            </div>
        </div>
    );
}
