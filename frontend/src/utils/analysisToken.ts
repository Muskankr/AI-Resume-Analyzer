/**
 * The claim that authorises polling one analysis task.
 *
 * `/api/upload/` returns a `task_id` and an `analysis_token`. The id names the
 * task; the token says who may ask about it. Before this existed, the id alone
 * was enough to read the finished analysis — `resume_text` and all — from
 * `/api/status/<task_id>/`, and the id sits in a URL path, so it is written to
 * access logs, proxy logs and browser history along the way (#706).
 *
 * The token therefore goes in a **header**, not a query parameter. Putting the
 * replacement credential in the same place as the leak would achieve nothing.
 */

/** Must match `CLAIM_HEADER` in `analyzer/task_claims.py`. */
export const ANALYSIS_TOKEN_HEADER = 'X-Analysis-Token'

/**
 * Build the header object for a status poll.
 *
 * Returns `{}` when there is no token, rather than a header with an empty
 * value. A backend rolled out before this frontend does not send one, and an
 * empty `X-Analysis-Token` would be a claim that fails verification rather than
 * an absent claim — which reads as tampering in the logs instead of as an old
 * client.
 */
export function analysisTokenHeaders(token: unknown): Record<string, string> {
  if (typeof token !== 'string' || token.length === 0) return {}
  return { [ANALYSIS_TOKEN_HEADER]: token }
}
