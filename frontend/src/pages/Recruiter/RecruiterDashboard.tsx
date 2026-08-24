import React, { useState } from 'react';
import { DragDropBatchZone } from './DragDropBatchZone';
import { BatchProgressPanel } from './BatchProgressPanel';
import { CandidateRankingGrid } from './CandidateRankingGrid';

export const RecruiterDashboard: React.FC = () => {
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  const handleUploadStart = (batchId: string) => {
    setActiveBatchId(batchId);
    setCandidates([]);
  };

  const handleBatchComplete = (results: any[]) => {
    setCandidates(results);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Recruiter Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a batch of resumes in a ZIP file to automatically analyze and rank candidates for a position.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <DragDropBatchZone onUploadStart={handleUploadStart} />
          
          {activeBatchId && (
            <BatchProgressPanel 
              batchId={activeBatchId} 
              onComplete={handleBatchComplete} 
            />
          )}
        </div>

        <div className="lg:col-span-2">
          {candidates.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Candidate Ranking</h2>
              <CandidateRankingGrid candidates={candidates} />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center h-full flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No candidates yet</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Upload a ZIP file containing resumes to see the AI-ranked candidate list here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
