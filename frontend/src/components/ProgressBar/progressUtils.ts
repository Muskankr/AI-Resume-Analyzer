export const MAX_PROGRESS = 100

export const DEFAULT_PIPELINE_STAGES = [
  { stage: 'extracting', label: 'Extracting text from document', percent: 25 },
  { stage: 'matching', label: 'Detecting & matching skills', percent: 60 },
  { stage: 'scoring', label: 'Generating ATS score & suggestions', percent: 90 },
  { stage: 'done', label: 'Analysis complete', percent: 100 },
]
