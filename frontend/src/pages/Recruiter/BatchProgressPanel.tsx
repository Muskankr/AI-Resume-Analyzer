import React, { useEffect, useState } from 'react';

interface BatchProgressPanelProps {
  batchId: string;
  onComplete: (results: any[]) => void;
}

export const BatchProgressPanel: React.FC<BatchProgressPanelProps> = ({ batchId, onComplete }) => {
  const [status, setStatus] = useState<string>('Pending');
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/analyzer/batch-status/${batchId}/`);
        if (!response.ok) {
          throw new Error('Failed to fetch batch status');
        }
        const data = await response.json();
        
        setStatus(data.status);
        setTotalFiles(data.total_files);
        setProcessedFiles(data.processed_files);
        
        if (data.status === 'Completed' || data.status === 'Failed') {
          if (data.status === 'Completed') {
             onComplete(data.results || []);
          } else {
             setError(data.error_message || 'Batch processing failed');
          }
          return true; // stop polling
        }
      } catch (err: any) {
        setError(err.message);
        return true; // stop polling on error
      }
      return false; // continue polling
    };

    let intervalId: NodeJS.Timeout;
    
    const poll = async () => {
      const stop = await fetchStatus();
      if (!stop) {
        intervalId = setTimeout(poll, 3000);
      }
    };
    
    poll();
    
    return () => clearTimeout(intervalId);
  }, [batchId, onComplete]);

  const percentage = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Processing Resumes</h3>
      
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            Parsed {processedFiles} / {totalFiles}
          </p>
        </>
      )}
    </div>
  );
};
