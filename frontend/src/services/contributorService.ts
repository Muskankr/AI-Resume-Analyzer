import { api } from '../api/client'

export interface ContributorInfo {
  username: string
  name: string
  avatar_url: string
  profile_url: string
  bio: string
}

export interface ContributionProject {
  name: string
  repo: string
  repo_url: string
}

export interface ContributionStatistics {
  merged_prs_count: number
  tier: string
  tier_badge: string
  tier_title: string
  first_contribution_date: string
  latest_contribution_date: string
}

export interface ContributorPullRequest {
  number: number
  title: string
  html_url: string
  created_at: string
  closed_at?: string
}

export interface ContributorCertificateResponse {
  certificate_id: string
  contributor: ContributorInfo
  project: ContributionProject
  statistics: ContributionStatistics
  pull_requests: ContributorPullRequest[]
  issued_date: string
  verification_url: string
}

/**
 * Fetches verified contribution statistics and certificate metadata for a GitHub username.
 */
export async function getContributorCertificate(username: string): Promise<ContributorCertificateResponse> {
  const cleanUsername = username.trim().replace(/^@/, '')
  const response = await api.get<ContributorCertificateResponse>('/api/contributor-certificate/', {
    params: { username: cleanUsername },
  })
  return response.data
}
