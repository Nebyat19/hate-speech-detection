import {
  coreDetoxifyToxicityScore,
  looksLikeDetoxifyMultilingual,
  normalizeClassificationResults,
  primaryCoreToxicityLabel,
} from "./xlmMultilingualToxic.js";

/**
 * @param {string} raw
 * @returns {boolean}
 */
function isNegatedToxicLabel(raw) {
  const l = raw.toLowerCase();
  return (
    l.includes("not-toxic") ||
    l.includes("non-toxic") ||
    l.includes("nontoxic") ||
    l === "not toxic" ||
    l.includes("non_toxic")
  );
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
function isToxicLabel(raw) {
  const l = raw.toLowerCase();
  if (isNegatedToxicLabel(l)) return false;
  if (l.includes("toxic")) return true;
  return (
    l.includes("insult") ||
    l.includes("obscene") ||
    l.includes("threat") ||
    l.includes("identity_attack") ||
    l.includes("severe_toxic")
  );
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
function isSafeClassLabel(raw) {
  const l = raw.toLowerCase();
  if (isNegatedToxicLabel(l)) return true;
  return (
    l.includes("non-toxic") ||
    l.includes("nontoxic") ||
    l === "not toxic" ||
    l.includes("safe") ||
    l === "neutral" ||
    l.includes("clean") ||
    l === "accept"
  );
}

/**
 * @param {{ label: string, score: number }[]} normalized
 * @returns {number}
 */
function toxicityProbabilityBinaryLike(normalized) {
  if (!normalized?.length) return 0;

  let maxToxic = 0;
  let maxSafe = 0;
  for (const r of normalized) {
    const label = String(r.label ?? "");
    const s = Math.min(1, Math.max(0, Number(r.score) || 0));
    if (isToxicLabel(label)) maxToxic = Math.max(maxToxic, s);
    if (isSafeClassLabel(label)) maxSafe = Math.max(maxSafe, s);
  }

  if (maxToxic > 0 && maxSafe > 0) {
    return Math.max(maxToxic, 1 - maxSafe);
  }
  if (maxToxic > 0) return maxToxic;
  if (maxSafe > 0) return 1 - maxSafe;

  const top = normalized[0];
  const score = Math.min(1, Math.max(0, Number(top.score) || 0));
  return score;
}

/**
 * Map text-classification outputs to P(abusive) in [0,1].
 * Supports binary heads (e.g. toxic / not-toxic) and detoxify multilingual XLM-R (16 sigmoid heads).
 *
 * @param {{ label: string, score: number }[]} results
 * @returns {number}
 */
export function toxicityProbabilityFromLabels(results) {
  const normalized = normalizeClassificationResults(results);
  if (looksLikeDetoxifyMultilingual(normalized)) {
    return coreDetoxifyToxicityScore(normalized);
  }
  return toxicityProbabilityBinaryLike(normalized);
}

/**
 * @param {{ label: string, score: number }[]} results
 * @returns {string}
 */
export function primaryFlaggedCategoryLabel(results) {
  const normalized = normalizeClassificationResults(results);
  if (looksLikeDetoxifyMultilingual(normalized)) {
    return primaryCoreToxicityLabel(normalized);
  }
  const hit = results.find((r) => isToxicLabel(String(r.label ?? "")));
  if (hit) return String(hit.label);
  return String(results[0]?.label || "toxic");
}
