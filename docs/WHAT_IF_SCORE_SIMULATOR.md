# "What-If" Score Simulator Documentation

## Overview

The **"What-If" Score Simulator** feature lets candidates select hypothetical missing skills and preview projected ATS match, domain coverage, and overall resume readiness increases before manually editing and re-uploading their resume files.

---

## Key Capabilities

1. **Interactive Preview**: Select or add any missing skill (e.g., TypeScript, Docker, AWS) to calculate real-time score deltas.
2. **Diminishing Returns Engine**: Algorithmically weights initial missing skills with higher impact while scaling subsequent additions to reflect realistic ATS screening behavior.
3. **Transparent Estimation Labeling**: Explicitly labeled as an algorithmic projection to avoid misrepresenting real resume parsing results.
4. **Skill Breakdown**: Highlights per-skill contribution (+8% High Impact vs +4% Low Impact) with actionable explanation text.

---

## Usage Example

```tsx
import React from 'react'
import { WhatIfScoreSimulator } from '../components/WhatIfScoreSimulator'

export const CandidateDashboard: React.FC = () => {
  return (
    <div>
      <WhatIfScoreSimulator
        currentScore={72}
        detectedSkills={['React', 'JavaScript', 'HTML5']}
        suggestedSkills={['TypeScript', 'Docker', 'AWS', 'PostgreSQL']}
      />
    </div>
  )
}
```
