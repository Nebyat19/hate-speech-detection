/**
 * Map text-classification top-N output to P(toxic) in [0,1].
 * Toxicity-oriented models (e.g. Xenova/toxic-bert) return label "toxic" with that probability.
 * "Safe" top labels invert the score.
 *
 * @param {{ label: string, score: number }[]} results
 * @returns {number}
 */
export function toxicityProbabilityFromLabels(results) {
  const top = results[0];
  if (!top) return 0;
  const label = String(top.label || "").toLowerCase();
  const score = Math.min(1, Math.max(0, Number(top.score) || 0));

  if (
    label.includes("non-toxic") ||
    label.includes("nontoxic") ||
    label === "not toxic" ||
    label.includes("safe") ||
    label === "neutral" ||
    label === "clean" ||
    label === "accept"
  ) {
    return 1 - score;
  }
  return score;
}
