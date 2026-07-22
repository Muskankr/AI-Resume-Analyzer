import { MAX_PROGRESS, DEFAULT_PIPELINE_STAGES } from './progressUtils'
import React from 'react'
import './ProgressBar.css'

export interface PipelineStage {
  stage: string
  label: string
  percent: number
}

export interface ProgressBarProps {
  progress?: number // 0 to 100
  stageLabel?: string
  stages?: PipelineStage[]
  isIndeterminate?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress = 0,
  stageLabel,
  stages = DEFAULT_PIPELINE_STAGES,
  isIndeterminate = false,
}) => {
  const currentPercent = Math.min(MAX_PROGRESS, Math.max(0, progress))

  // Determine active stage label
  const activeStage = stages.reduce<PipelineStage | null>((acc, stage) => {
    if (currentPercent >= stage.percent) return stage
    return acc
  }, stages[0] || null)

  const displayLabel = stageLabel || (activeStage ? activeStage.label : 'Analyzing resume...')

  return (
    <div className="determinate-progress-wrapper my-4" role="status" aria-live="polite">
      <div className="progress-header">
        <span className="progress-stage-label">{displayLabel}</span>
        <span className="progress-percentage-text">
          {isIndeterminate ? 'Analyzing...' : `${Math.round(currentPercent)}%`}
        </span>
      </div>

      <div
        className={`progress-bar-track ${isIndeterminate ? 'is-indeterminate' : ''}`}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : currentPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Resume analysis progress"
      >
        <div
          className="progress-bar-fill"
          style={{ width: isIndeterminate ? '100%' : `${currentPercent}%` }}
        />
      </div>

      {/* Discrete Pipeline Stage Checkpoints */}
      {!isIndeterminate && stages && stages.length > 0 && (
        <div className="progress-stages-stepper mt-3">
          {stages.map((stg) => {
            const isCompleted = currentPercent >= stg.percent
            return (
              <div
                key={stg.stage}
                className={`stage-checkpoint ${isCompleted ? 'checkpoint-completed' : 'checkpoint-upcoming'}`}
              >
                <div className="checkpoint-dot" />
                <span className="checkpoint-label">{stg.percent}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProgressBar
