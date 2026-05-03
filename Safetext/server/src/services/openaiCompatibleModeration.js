import { randomUUID } from "node:crypto";

/**
 * Response shape inspired by OpenAI POST /v1/moderations so existing integrations
 * can switch base URL + auth with minimal changes.
 *
 * @param {string} modelId
 * @param {{ safe: boolean, toxicityScore: number, scoresByCategory?: Record<string, number> }[]} classifyResults
 */
export function buildOpenAIModerationResponse(modelId, classifyResults) {
  const results = classifyResults.map((r) => {
    const t = Math.min(1, Math.max(0, r.toxicityScore));
    const flagged = !r.safe;

    /** @type {Record<string, number>} */
    const category_scores = { toxic: t };
    for (const [k, v] of Object.entries(r.scoresByCategory || {})) {
      const key = String(k).replace(/-/g, "_");
      if (key !== "toxic") {
        category_scores[key] = Number(v) || 0;
      }
    }

    return {
      flagged,
      categories: {
        toxic: flagged,
      },
      category_scores,
    };
  });

  return {
    id: `modr-sg-${randomUUID()}`,
    model: modelId,
    results,
  };
}

/**
 * @param {unknown} input OpenAI-style: string | string[]
 * @returns {string[]}
 */
export function normalizeModerationInputs(input) {
  if (input === undefined || input === null) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.map((x) => String(x));
  }
  return [String(input)];
}
