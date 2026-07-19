import { useEffect, useMemo, useRef, useState } from "react";

interface WordCloudWord {
  text: string;
  value: number;
}

interface SkillWordCloudProps {
  skills: string[];
}

/**
 * Compute a weight for each skill based on its position in the list.
 * Earlier skills get higher weight, simulating "frequency/relevance".
 * Falls back to a minimum weight so even a single skill renders visibly.
 */
function computeWeights(skills: string[]): WordCloudWord[] {
  if (skills.length === 0) return [];
  const maxWeight = 100;
  const minWeight = 20;
  // If only 1 skill, give it a moderate weight
  if (skills.length === 1) return [{ text: skills[0], value: 60 }];
  return skills.map((text, i) => ({
    text,
    value: Math.max(minWeight, maxWeight - (i / (skills.length - 1)) * (maxWeight - minWeight)),
  }));
}

/**
 * Deterministic color palette that works on both light and dark themes.
 */
const PALETTE = [
  "#00ffae", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6",
  "#34d399", "#fbbf24", "#fb923c", "#f87171", "#e879f9",
];

function getColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/**
 * A simple SVG word cloud that uses d3-cloud layout.
 * Falls back to a plain list when there are very few words (≤3).
 */
export function SkillWordCloud({ skills }: SkillWordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [words, setWords] = useState<WordCloudWord[]>([]);
  const [layoutReady, setLayoutReady] = useState(false);

  const wordsData = useMemo(() => computeWeights(skills), [skills]);

  // Measure container width on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.min(rect.width, 600);
      setDimensions({ width: w, height: Math.max(260, w * 0.75) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Run d3-cloud layout when dimensions or words change
  useEffect(() => {
    if (wordsData.length === 0 || dimensions.width === 0) {
      setWords(wordsData);
      setLayoutReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const cloudModule = await import("d3-cloud");
      const cloudLayout = cloudModule.default ?? cloudModule;

      const layout = cloudLayout()
        .size([dimensions.width, dimensions.height])
        .words(wordsData.map((w) => ({ text: w.text, size: w.value })))
        .padding(4)
        .rotate(() => 0) // keep words horizontal for readability
        .font("Arial, sans-serif")
        .fontSize((d: { size?: number }) => {
          const size = d.size ?? 50;
          // Scale font size between 12px and 36px based on weight
          const minSize = 12;
          const maxSize = 36;
          const minWeight = Math.min(...wordsData.map((w) => w.value));
          const maxWeight = Math.max(...wordsData.map((w) => w.value));
          if (maxWeight === minWeight) return (minSize + maxSize) / 2;
          return minSize + ((size - minWeight) / (maxWeight - minWeight)) * (maxSize - minSize);
        });

      layout.on("end", (layoutWords: Array<{ text: string; size: number; x?: number; y?: number }>) => {
        if (cancelled) return;
        setWords(
          layoutWords.map((w) => ({
            text: w.text,
            value: w.size, // w.size is already the computed font size px value
            x: w.x ?? 0,
            y: w.y ?? 0,
          })) as WordCloudWord[]
        );
        setLayoutReady(true);
      });

      layout.start();
    })();

    return () => {
      cancelled = true;
    };
  }, [wordsData, dimensions]);

  // ── Empty state ──
  if (skills.length === 0) {
    return (
      <div className="wordcloud-wrapper" ref={containerRef}>
        <p className="wordcloud-empty">No skills to display</p>
      </div>
    );
  }

  // ── Fallback for very few words (≤3) – render as styled badges ──
  if (skills.length <= 3) {
    return (
      <div className="wordcloud-wrapper" ref={containerRef}>
        <h4 className="wordcloud-title">Skills Word Cloud</h4>
        <div className="wordcloud-fallback">
          {skills.map((skill, i) => (
            <span
              key={skill}
              className="wordcloud-fallback-word"
              style={{ color: getColor(i) }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Loading state while layout computes ──
  if (!layoutReady) {
    return (
      <div className="wordcloud-wrapper" ref={containerRef}>
        <h4 className="wordcloud-title">Skills Word Cloud</h4>
        <div className="wordcloud-loading">Rendering…</div>
      </div>
    );
  }

  // ── SVG word cloud ──
  const svgWidth = dimensions.width;
  const svgHeight = dimensions.height;

  return (
    <div className="wordcloud-wrapper" ref={containerRef}>
      <h4 className="wordcloud-title">Skills Word Cloud</h4>
      <svg
        viewBox={`${-svgWidth / 2} ${-svgHeight / 2} ${svgWidth} ${svgHeight}`}
        className="wordcloud-svg"
        aria-label="Word cloud of detected skills"
      >
        {(words as WordCloudWord[]).map((w, i) => {
          const fontSize = w.value;
          return (
            <text
              key={w.text}
              x={(w as unknown as { x: number }).x ?? 0}
              y={(w as unknown as { y: number }).y ?? 0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={fontSize > 22 ? "bold" : "normal"}
              fill={getColor(i)}
              fontFamily="Arial, sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {w.text}
            </text>
          );
        })}
      </svg>
    </div>
  );
}