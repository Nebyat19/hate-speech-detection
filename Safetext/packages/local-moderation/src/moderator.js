import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, pipeline } from "@xenova/transformers";
import { primaryFlaggedCategoryLabel, toxicityProbabilityFromLabels } from "./toxicity.js";
import {
  ensureXlmMultilingualOnnxBundle,
  XLM_MULTILINGUAL_TOXIC_REPO,
} from "./xlmMultilingualToxic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default: XLM-RoBERTa multilingual toxicity (Detoxify-style, ONNX). First run downloads ~280MB into .xlm-multilingual-toxic/. */
export const DEFAULT_LOCAL_MODERATION_MODEL = XLM_MULTILINGUAL_TOXIC_REPO;

/** Package root (…/packages/local-moderation). ONNX bundle lives in ${PKG_ROOT}/.xlm-multilingual-toxic. */
const PKG_ROOT = path.join(__dirname, "..");

const XLM_BUNDLE_DIR_NAME = ".xlm-multilingual-toxic";

const DEFAULT_XLM_BUNDLE_DIR = path.join(PKG_ROOT, XLM_BUNDLE_DIR_NAME);

/**
 * @typedef {Object} LocalModeratorOptions
 * @property {string} [modelId] Hub model id or local directory path
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
  const modelId = options.modelId ?? DEFAULT_LOCAL_MODERATION_MODEL;
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
      let loadId = modelId;
      /** @type {string | null} */
      let restoreLocalModelPath = null;

      if (modelId === XLM_MULTILINGUAL_TOXIC_REPO) {
        await ensureXlmMultilingualOnnxBundle(DEFAULT_XLM_BUNDLE_DIR);
        // Transformers.js hub helpers break on absolute paths as "model id" (they become bogus HF URLs).
        // Load the bundle relative to PKG_ROOT via env.localModelPath (see env.js / hub.js pathJoin).
        restoreLocalModelPath = env.localModelPath;
        env.localModelPath = path.normalize(PKG_ROOT) + path.sep;
        loadId = XLM_BUNDLE_DIR_NAME;
      } else if (path.isAbsolute(modelId)) {
        restoreLocalModelPath = env.localModelPath;
        env.localModelPath = path.normalize(path.dirname(modelId)) + path.sep;
        loadId = path.basename(modelId);
      }

      if (typeof onFirstLoad === "function") {
        onFirstLoad(
          modelId === XLM_MULTILINGUAL_TOXIC_REPO
            ? DEFAULT_XLM_BUNDLE_DIR
            : path.isAbsolute(modelId)
              ? modelId
              : loadId
        );
      }
      pipePromise = pipeline("text-classification", loadId, { quantized: true })
        .then((pipe) => {
          const cfg = pipe.model?.config;
          if (cfg?.model_type === "xlm-roberta") {
            const n = Object.keys(cfg.id2label || {}).length;
            if (n > 2) cfg.problem_type = "multi_label_classification";
          }
          return pipe;
        })
        .finally(() => {
          if (restoreLocalModelPath !== null) {
            env.localModelPath = restoreLocalModelPath;
          }
        });
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
    const raw = await classifier(trimmed, { topk: null });
    const results = Array.isArray(raw) ? raw : [raw];

    const toxicityScore = toxicityProbabilityFromLabels(results);
    const safe = toxicityScore < threshold;

    const flaggedCategories =
      safe || !results[0] ? [] : [primaryFlaggedCategoryLabel(results)];

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
