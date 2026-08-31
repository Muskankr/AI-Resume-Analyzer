import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { featureFlagService, FeatureFlag, FeatureFlagUserContext } from '../services/featureFlagService'

interface FeatureFlagContextValue {
  flags: FeatureFlag[]
  overrides: Record<string, boolean>
  isEnabled: (key: string) => boolean
  setOverride: (key: string, enabled: boolean | null) => void
  resetOverrides: () => void
  context?: FeatureFlagUserContext
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: [],
  overrides: {},
  isEnabled: () => false,
  setOverride: () => {},
  resetOverrides: () => {},
})

/** Hook to check a single feature flag's active status */
export function useFeatureFlag(flagKey: string, userContext?: FeatureFlagUserContext): boolean {
  const [enabled, setEnabled] = useState<boolean>(() =>
    featureFlagService.isEnabled(flagKey, userContext)
  )

  useEffect(() => {
    // Synchronize initial state
    setEnabled(featureFlagService.isEnabled(flagKey, userContext))

    // Subscribe to updates
    const unsubscribe = featureFlagService.subscribe(() => {
      setEnabled(featureFlagService.isEnabled(flagKey, userContext))
    })

    return unsubscribe
  }, [flagKey, userContext])

  return enabled
}

/** Hook to manage and inspect all feature flags */
export function useFeatureFlags(userContext?: FeatureFlagUserContext) {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => featureFlagService.getFlags())
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() =>
    featureFlagService.getOverrides()
  )

  useEffect(() => {
    const unsubscribe = featureFlagService.subscribe(() => {
      setFlags(featureFlagService.getFlags())
      setOverrides(featureFlagService.getOverrides())
    })
    return unsubscribe
  }, [])

  const setOverride = useCallback((key: string, enabled: boolean | null) => {
    featureFlagService.setOverride(key, enabled)
  }, [])

  const resetOverrides = useCallback(() => {
    featureFlagService.resetAllOverrides()
  }, [])

  const isEnabled = useCallback(
    (key: string) => featureFlagService.isEnabled(key, userContext),
    [userContext]
  )

  return {
    flags,
    overrides,
    isEnabled,
    setOverride,
    resetOverrides,
  }
}

/** Hook to consume FeatureFlagContext */
export function useFeatureFlagContext() {
  return useContext(FeatureFlagContext)
}
