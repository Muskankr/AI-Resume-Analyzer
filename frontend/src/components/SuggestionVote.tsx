import './SuggestionVote.css'

export type VoteValue = 'up' | 'down'

interface SuggestionVoteProps {
  /** The vote already stored for this suggestion, if any. */
  vote?: VoteValue | null
  /** Called with the new vote, or `null` when the current vote is withdrawn. */
  onVote: (vote: VoteValue | null) => void
  /** Suggestion text, used to describe the buttons to screen readers. */
  suggestion: string
  disabled?: boolean
}

/**
 * Up/down controls for one generated suggestion.
 *
 * Clicking the vote you already gave withdraws it, so a mis-click is
 * recoverable without a separate "clear" affordance.
 */
export function SuggestionVote({
  vote = null,
  onVote,
  suggestion,
  disabled = false,
}: SuggestionVoteProps) {
  const label = suggestion.length > 60 ? `${suggestion.slice(0, 60)}…` : suggestion

  const cast = (value: VoteValue) => {
    onVote(vote === value ? null : value)
  }

  return (
    <span
      className="suggestion-vote"
      role="group"
      aria-label={`Was this suggestion helpful? ${label}`}
    >
      <button
        type="button"
        className={`suggestion-vote__btn${vote === 'up' ? ' is-active' : ''}`}
        onClick={() => cast('up')}
        disabled={disabled}
        aria-pressed={vote === 'up'}
        title="Helpful"
      >
        <span aria-hidden="true">👍</span>
        <span className="sr-only">Mark as helpful: {label}</span>
      </button>
      <button
        type="button"
        className={`suggestion-vote__btn${vote === 'down' ? ' is-active is-negative' : ''}`}
        onClick={() => cast('down')}
        disabled={disabled}
        aria-pressed={vote === 'down'}
        title="Not helpful"
      >
        <span aria-hidden="true">👎</span>
        <span className="sr-only">Mark as not helpful: {label}</span>
      </button>
    </span>
  )
}

export default SuggestionVote
