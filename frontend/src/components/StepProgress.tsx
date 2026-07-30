import React from 'react'

interface StepProgressProps {
  currentStep: 1 | 2 | 3
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep }) => {
  return (
    <div
      className="step-progress-wrapper mb-4"
      aria-label="Progress"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={3}
    >
      <div className="step-progress-container">
        {/* Step 1: Upload */}
        <div className="step-item">
          <div
            className={`step-circle ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming'}`}
            aria-current={currentStep === 1 ? 'step' : undefined}
          >
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <span className={`step-label ${currentStep >= 1 ? 'active' : ''}`}>Upload</span>
        </div>

        <div className={`step-line ${currentStep >= 2 ? 'active-line' : ''}`}></div>

        {/* Step 2: Analyzing */}
        <div className="step-item">
          <div
            className={`step-circle ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming'}`}
            aria-current={currentStep === 2 ? 'step' : undefined}
          >
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <span className={`step-label ${currentStep >= 2 ? 'active' : ''}`}>Analyzing</span>
        </div>

        <div className={`step-line ${currentStep >= 3 ? 'active-line' : ''}`}></div>

        {/* Step 3: Results */}
        <div className="step-item">
          <div
            className={`step-circle ${currentStep === 3 ? 'current completed' : 'upcoming'}`}
            aria-current={currentStep === 3 ? 'step' : undefined}
          >
            {currentStep > 3 ? '✓' : '3'}
          </div>
          <span className={`step-label ${currentStep === 3 ? 'active' : ''}`}>Results</span>
        </div>
      </div>
    </div>
  )
}
