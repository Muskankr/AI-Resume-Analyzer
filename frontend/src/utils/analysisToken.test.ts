import { describe, expect, it } from 'vitest'

import { ANALYSIS_TOKEN_HEADER, analysisTokenHeaders } from './analysisToken'

describe('analysisTokenHeaders (#706)', () => {
  it('sends the claim under the header the backend reads', () => {
    expect(analysisTokenHeaders('abc.def.ghi')).toEqual({ [ANALYSIS_TOKEN_HEADER]: 'abc.def.ghi' })
  })

  it('matches the header name in analyzer/task_claims.py', () => {
    expect(ANALYSIS_TOKEN_HEADER).toBe('X-Analysis-Token')
  })

  it('omits the header entirely when there is no token', () => {
    // An empty value would be a claim that fails verification, which reads as
    // tampering in the backend log rather than as an older client.
    expect(analysisTokenHeaders(undefined)).toEqual({})
    expect(analysisTokenHeaders('')).toEqual({})
    expect(analysisTokenHeaders(null)).toEqual({})
  })

  it('ignores a non-string token rather than stringifying it', () => {
    expect(analysisTokenHeaders(42)).toEqual({})
    expect(analysisTokenHeaders({ token: 'x' })).toEqual({})
  })
})
