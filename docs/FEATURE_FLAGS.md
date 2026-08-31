# Feature Flag System Documentation

## Overview

The **AI Resume Analyzer** feature flag system allows developers and maintainers to safely roll out, experiment with, and toggle new capabilities (such as Resume Roast Mode, Template Gallery, AI Bullet Point Optimizer, etc.) without requiring an immediate full application redeployment for each change.

---

## Key Capabilities

1. **Config-based Flag Definitions**: Default feature flag statuses are declared cleanly in `DEFAULT_FEATURE_FLAGS`.
2. **Local Storage Overrides**: Developers and administrators can toggle any flag in real time using the `FeatureFlagManagerModal` UI or via `featureFlagService.setOverride(flagKey, enabled)`.
3. **Role & Target Restrictions**: Flags can be restricted to specific user roles (e.g. `admin`, `maintainer`).
4. **Subscribers & React Hooks**: Components automatically re-render when a feature flag state changes using `useFeatureFlag(flagKey)`.

---

## How to Use in Components

### React Hook Example

```tsx
import React from 'react'
import { useFeatureFlag } from '../hooks/useFeatureFlag'

export const MyNewFeatureComponent: React.FC = () => {
  const isRoastModeEnabled = useFeatureFlag('roast_mode')

  if (!isRoastModeEnabled) {
    return null
  }

  return (
    <div className="roast-mode-banner">
      🔥 Resume Roast Mode is Active!
    </div>
  )
}
```

---

## How to Register a New Experimental Flag

To introduce a new experimental flag:

1. Open [`frontend/src/services/featureFlagService.ts`](file:///c:/Users/babin/Desktop/ECSoC_2026/AI-Resume-Analyzer/frontend/src/services/featureFlagService.ts).
2. Add your flag object to `DEFAULT_FEATURE_FLAGS`:

```typescript
export const DEFAULT_FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // ...
  my_new_experiment: {
    key: 'my_new_experiment',
    name: 'My New Experimental Feature',
    description: 'Description of what this feature does.',
    enabledByDefault: false,
    experimental: true,
    category: 'experimental',
    createdAt: '2026-08-30',
  },
}
```

3. Use `useFeatureFlag('my_new_experiment')` in your component logic.

---

## Overriding Flags in Local Development

- Open the Feature Flag Manager Modal from the footer or dev tools panel.
- Or execute in browser developer console:
```javascript
localStorage.setItem('ai_resume_analyzer_feature_flag_overrides', JSON.stringify({ roast_mode: false }))
```
