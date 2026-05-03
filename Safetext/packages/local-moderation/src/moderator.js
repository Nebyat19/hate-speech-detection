import { env, pipeline } from "@xenova/transformers";
import { toxicityProbabilityFromLabels } from "./toxicity.js";

/**
 * @typedef {Object} LocalModeratorOptions
 * @property {string} [modelId] Hub model id (default Xenova/toxic-bert)
 * @property {string | null} [cacheDir] Transformers cache directory
 * @property {(modelId: string) => void} [onFirstLoad] Called before the pipeline is created (e.g. log "downloading…")
 */

/**
 * @typedef {Object} ClassifyResult
 * @property {boolean} safe
 * @property {number} toxicityScore
 * @property {string[]} flaggedCategories
 * @property {Record<string, number>} scoresByCategory
 */

/**
 * @param {LocalModeratorOptions} [options]
 */
export function createModerator(options = {}) {
  const modelId = options.modelId ?? "Xenova/toxic-bert";
  const cacheDir = options.cacheDir ?? null;
  const onFirstLoad = options.onFirstLoad ?? null;

  /** @type {Promise<any> | null} */
  let pipePromise = null;

  function ensureCache() {
    const dir = typeof cacheDir === "string" ? cacheDir.trim() : "";
    if (dir) {
      env.cacheDir = dir;
    }
  }

  async function getClassifier() {
    ensureCache();
    if (!pipePromise) {
      if (typeof onFirstLoad === "function") {
        onFirstLoad(modelId);
      }
      pipePromise = pipeline("text-classification", modelId);
    }
    return pipePromise;
  }

  /**
   * @param {string} text
   * @param {{ threshold?: number }} [opts]
   * @returns {Promise<ClassifyResult>}
   */
  async function classify(text, opts = {}) {
    const threshold =
      typeof opts.threshold === "number" && Number.isFinite(opts.threshold)
        ? opts.threshold
        : 0.5;

    const trimmed = String(text ?? "").trim();
    if (!trimmed) {
      return {
        safe: true,
        toxicityScore: 0,
        flaggedCategories: [],
        scoresByCategory: {},
      };
    }

    const classifier = await getClassifier();
    /** @type {{ label: string, score: number } | { label: string, score: number }[]} */
    const raw = await classifier(trimmed);
    const results = Array.isArray(raw) ? raw : [raw];

    const toxicityScore = toxicityProbabilityFromLabels(results);
    const safe = toxicityScore < threshold;

    const flaggedCategories =
      safe || !results[0] ? [] : [String(results[0].label || "toxic")];

    const scoresByCategory = Object.fromEntries(
      results.map((r) => [r.label, Number(r.score) || 0])
    );

    return {
      safe,
      toxicityScore,
      flaggedCategories,
      scoresByCategory,
    };
  }

  return {
    modelId,
    classify,
  };
}
