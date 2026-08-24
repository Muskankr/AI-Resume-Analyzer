"""SVG rendering for the public resume score badge."""

from xml.sax.saxutils import escape


def _score_color(score):
    if score is None:
        return "#64748b"
    if score >= 80:
        return "#16a34a"
    if score >= 60:
        return "#ca8a04"
    return "#dc2626"


def generate_score_badge(score):
    """Return a small self-contained SVG showing the latest ATS score.

    Only the numeric score is accepted from application data. Text is escaped
    so the public image endpoint cannot accidentally produce executable SVG
    markup from stored values.
    """
    if score is None:
        value = "N/A"
    else:
        value = str(max(0, min(100, int(score)))) + "%"

    label = "ATS Score"
    label_width = 76
    value_width = 52 if value != "N/A" else 54
    total_width = label_width + value_width
    color = _score_color(score)

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="28" role="img" aria-label="{escape(label)}: {escape(value)}">
  <title>{escape(label)}: {escape(value)}</title>
  <rect width="{total_width}" height="28" rx="5" fill="#555"/>
  <rect x="{label_width}" width="{value_width}" height="28" rx="5" fill="{color}"/>
  <rect x="{label_width}" width="6" height="28" fill="{color}"/>
  <text x="38" y="18" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="12" text-anchor="middle">{escape(label)}</text>
  <text x="{label_width + value_width / 2}" y="18" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" text-anchor="middle">{escape(value)}</text>
</svg>'''
