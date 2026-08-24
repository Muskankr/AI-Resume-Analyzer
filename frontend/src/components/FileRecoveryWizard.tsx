import React, { useState } from 'react';

// Define the discrete phases of the error recovery workflow
type WizardStep = 'ERROR_FEEDBACK' | 'RESOLUTION_STRATEGY' | 'RECOVERY_ACTION' | 'SUCCESS';

// Specify the exact type of parsing failure detected by the backend ATS
export type ParsingErrorType = 'CORRUPTED_STRUCTURE' | 'SCANNED_PDF_NO_TEXT' | 'UNSUPPORTED_RICH_FORMAT';

interface FileRecoveryWizardProps {
  errorType: ParsingErrorType;
  fileName: string;
  onRetryUpload: (file: File) => Promise<boolean>;
  onClose: () => void;
}

export const FileRecoveryWizard: React.FC<FileRecoveryWizardProps> = ({
  errorType,
  fileName,
  onRetryUpload,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('ERROR_FEEDBACK');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Configuration map for dynamic, contextual error diagnostics
  const errorDetails = {
    CORRUPTED_STRUCTURE: {
      title: 'Corrupted File Structure',
      description: `The file "${fileName}" could not be opened because its internal data structure is broken or missing binary segments. This often happens due to a network interruption during download or an incomplete export save.`,
      resolution: 'Re-save or re-export the document from your word processor (e.g., Microsoft Word, Google Docs) using the "Save As PDF" function to rebuild the file structure correctly.',
    },
    SCANNED_PDF_NO_TEXT: {
      title: 'Unreadable PDF Layer (Scanned Document)',
      description: `The file "${fileName}" was successfully opened, but it contains zero digital text elements. It appears to be an image or a flattened scan, making it invisible to automated parser engines.`,
      resolution: 'Export your resume directly as a text-based PDF rather than scanning a printed copy. Ensure you can highlight individual words and copy text with your mouse inside your PDF reader.',
    },
    UNSUPPORTED_RICH_FORMAT: {
      title: 'Unsupported Rich Layout Elements',
      description: `The file "${fileName}" contains complex multi-column graphics, text boxes, images, or interactive tables that scramble the ATS sequential reading path.`,
      resolution: 'Simplify the layout by using a clean, single-column design. Remove all text boxes, headers/footers containing critical info, and graphical elements before re-uploading.',
    },
  }[errorType];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setActionError(null);
    }
  };

  const executeRecovery = async () => {
    if (!selectedFile) {
      setActionError('Please select a resolved file version to upload.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      const success = await onRetryUpload(selectedFile);
      if (success) {
        setCurrentStep('SUCCESS');
      } else {
        setActionError('The newly uploaded file still failed verification. Please review the formatting instructions and try again.');
      }
    } catch (err) {
      setActionError('A network error occurred while reprocessing the document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl transition-all border border-slate-100">
        
        {/* Header Block & Step Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Resume Recovery Wizard</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>
          <div className="mt-4 flex h-1.5 w-full gap-1 rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all duration-300 ${currentStep === 'ERROR_FEEDBACK' ? 'w-1/3 bg-amber-500' : currentStep === 'RESOLUTION_STRATEGY' ? 'w-2/3 bg-blue-600' : 'w-full bg-emerald-600'}`} />
          </div>
        </div>

        {/* Step 1: Diagnostics and Error Feedback */}
        {currentStep === 'ERROR_FEEDBACK' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-amber-900">{errorDetails.title}</h4>
                <p className="mt-1 text-sm text-amber-800 leading-relaxed">{errorDetails.description}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => setCurrentStep('RESOLUTION_STRATEGY')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Analyze Resolution Strategy</button>
            </div>
          </div>
        )}

        {/* Step 2: Resolution Strategy and Education */}
        {currentStep === 'RESOLUTION_STRATEGY' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">🛠️ Actionable Blueprint</h4>
              <p className="mt-2 text-sm text-blue-800 leading-relaxed">{errorDetails.resolution}</p>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep('ERROR_FEEDBACK')} className="text-sm font-medium text-slate-500 hover:text-slate-700">← Back to Diagnosis</button>
              <div className="flex gap-3">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={() => setCurrentStep('RECOVERY_ACTION')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Proceed to Upload</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Actionable File Patching & Verification */}
        {currentStep === 'RECOVERY_ACTION' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center hover:border-blue-500 transition-colors bg-slate-50 relative">
              <input type="file" id="recoveryFile" accept=".pdf,.docx" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isSubmitting} />
              <div className="space-y-2">
                <span className="text-2xl block">📁</span>
                <p className="text-sm font-medium text-slate-700">
                  {selectedFile ? `Target: ${selectedFile.name}` : 'Select your repaired resume file'}
                </p>
                <p className="text-xs text-slate-400">Accepts standard text-based PDF or DOCX formats</p>
              </div>
            </div>

            {actionError && <p className="text-sm font-medium text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{actionError}</p>}

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setCurrentStep('RESOLUTION_STRATEGY')} className="text-sm font-medium text-slate-500 hover:text-slate-700" disabled={isSubmitting}>← Back</button>
              <div className="flex gap-3">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" disabled={isSubmitting}>Cancel</button>
                <button onClick={executeRecovery} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-400 flex items-center gap-2" disabled={isSubmitting || !selectedFile}>
                  {isSubmitting ? 'Verifying File Struct...' : 'Verify and Parse Resume'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Verification Success Screen */}
        {currentStep === 'SUCCESS' && (
          <div className="text-center py-6 space-y-4 animate-scaleUp">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">✓</div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Document Parsed Successfully</h4>
              <p className="mt-1 text-sm text-slate-500">The file structure has been validated. Your data profile is now compiling.</p>
            </div>
            <button onClick={onClose} className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Return to Profile Setup</button>
          </div>
        )}
        
      </div>
    </div>
  );
};
