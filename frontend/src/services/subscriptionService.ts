import { api } from '../api/client'

export interface TierFeatureLimits {
  max_history_items: number | null
  bulk_analysis_enabled: boolean
  priority_processing: boolean
  recruiter_dashboard_enabled: boolean
}

export interface TierDetails {
  name: string
  price: string
  description: string
  features: string[]
  limits: TierFeatureLimits
}

export interface SubscriptionResponse {
  username: string
  current_tier: 'free' | 'pro'
  tier_updated_at: string | null
  tier_details: TierDetails
  matrix: {
    free: TierDetails
    pro: TierDetails
  }
}

export interface UpdateTierResponse {
  message: string
  previous_tier: string
  current_tier: 'free' | 'pro'
  tier_details: TierDetails
  tier_updated_at: string
}

/**
 * Fetches current user's subscription tier and plan feature matrix.
 */
export async function getSubscriptionTier(): Promise<SubscriptionResponse> {
  const response = await api.get<SubscriptionResponse>('/api/account/tier/')
  return response.data
}

/**
 * Upgrades or downgrades user's subscription tier ('free' or 'pro').
 */
export async function updateSubscriptionTier(tier: 'free' | 'pro'): Promise<UpdateTierResponse> {
  const response = await api.post<UpdateTierResponse>('/api/account/tier/', { tier })
  return response.data
}
