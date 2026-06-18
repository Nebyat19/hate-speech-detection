import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, pipeline } from "@xenova/transformers";

import {
  AMHARIC_BUNDLE_DIR_NAME,
  AMHARIC_HATE_SPEECH_REPO,
  amharicOnnxBundleReady,
  ensureAmharicOnnxBundleCompat,
  ensureAmharicTokenizerCompat,
  classifyAmharicViaHfApi,
  DEFAULT_AMHARIC_BUNDLE_DIR,
} from "./amharicHateSpeech.js";

import { containsAmharic, containsLatin } from "./scriptDetect.js";

import {
  primaryFlaggedCategoryLabel,
  toxicityProbabilityFromLabels,
} from "./toxicity.js";

import {
  ensureXlmMultilingualOnnxBundle,
  XLM_MULTILINGUAL_TOXIC_REPO,
} from "./xlmMultilingualToxic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_LOCAL_MODERATION_MODEL =
  XLM_MULTILINGUAL_TOXIC_REPO;

const PKG_ROOT = path.join(__dirname, "..");

const XLM_BUNDLE_DIR_NAME = ".xlm-multilingual-toxic";

const DEFAULT_XLM_BUNDLE_DIR = path.join(PKG_ROOT, XLM_BUNDLE_DIR_NAME);

/* ----------------------------- helpers ----------------------------- */

function resultFromLabels(results, threshold) {
  const toxicityScore = toxicityProbabilityFromLabels(results);
  const safe = toxicityScore < threshold;

  const flaggedCategories =
    safe || !results[0]
      ? []
      : [primaryFlaggedCategoryLabel(results)];

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

/* ---------------- Amharic binary model support ---------------- */

function isBinaryAmharicModel(results) {
  return (
    Array.isArray(results) &&
    results.length > 0 &&
    results.every(
      (r) => r.label === "hate" || r.label === "normal"
    )
  );
}

function normalizeAmharicResults(results, threshold) {
  const hate =
    results.find((r) => r.label === "hate")?.score ?? 0;

  const normal =
    results.find((r) => r.label === "normal")?.score ?? 0;

  const toxicityScore = hate;

  return {
    toxicityScore,
    safe: toxicityScore < threshold,
    flaggedCategories:
      toxicityScore >= threshold ? ["toxicity"] : [],
    scoresByCategory: {
      hate,
      normal,
    },
  };
}

/* ----------------------------- main ----------------------------- */

export function createModerator(options = {}) {
  const modelId =
    options.modelId ?? DEFAULT_LOCAL_MODERATION_MODEL;

  const amharicEnabled = Boolean(options.amharicEnabled);

  const amharicModelId =
    options.amharicModelId ?? AMHARIC_HATE_SPEECH_REPO;

  const hfApiToken =
    typeof options.hfApiToken === "string"
      ? options.hfApiToken.trim()
      : "";

  const cacheDir = options.cacheDir ?? null;

  const onFirstLoad = options.onFirstLoad ?? null;

  let pipePromise = null;
  let amharicPipePromise = null;
  let amharicLocalReady = null;

  function ensureCache() {
    const dir =
      typeof cacheDir === "string" ? cacheDir.trim() : "";
    if (dir) env.cacheDir = dir;
  }

  async function loadPipeline(
    hubOrPath,
    bundleDirName,
    absoluteBundleDir,
    quantized
  ) {
    let loadId = hubOrPath;
    let restoreLocalModelPath = null;

    const useLocalBundle =
      hubOrPath === XLM_MULTILINGUAL_TOXIC_REPO ||
      hubOrPath === AMHARIC_HATE_SPEECH_REPO ||
      path.isAbsolute(hubOrPath);

    if (hubOrPath === XLM_MULTILINGUAL_TOXIC_REPO) {
      await ensureXlmMultilingualOnnxBundle(
        absoluteBundleDir
      );
      restoreLocalModelPath = env.localModelPath;
      env.localModelPath =
        path.normalize(PKG_ROOT) + path.sep;
      loadId = bundleDirName;
    } else if (
      hubOrPath === AMHARIC_HATE_SPEECH_REPO
    ) {
      restoreLocalModelPath = env.localModelPath;
      env.localModelPath =
        path.normalize(PKG_ROOT) + path.sep;
      loadId = bundleDirName;
    } else if (path.isAbsolute(hubOrPath)) {
      restoreLocalModelPath = env.localModelPath;
      env.localModelPath =
        path.dirname(hubOrPath) + path.sep;
      loadId = path.basename(hubOrPath);
    }

    if (typeof onFirstLoad === "function") {
      onFirstLoad(loadId);
    }

    return pipeline(
      "text-classification",
      loadId,
      { quantized }
    )
      .then((pipe) => {
        const cfg = pipe.model?.config;
        if (cfg?.model_type === "xlm-roberta") {
          const n = Object.keys(
            cfg.id2label || {}
          ).length;
          if (n > 2)
            cfg.problem_type =
              "multi_label_classification";
        }
        return pipe;
      })
      .finally(() => {
        if (restoreLocalModelPath !== null) {
          env.localModelPath = restoreLocalModelPath;
        }
      });
  }

  async function getClassifier() {
    ensureCache();
    if (!pipePromise) {
      pipePromise = loadPipeline(
        modelId,
        XLM_BUNDLE_DIR_NAME,
        DEFAULT_XLM_BUNDLE_DIR,
        true
      );
    }
    return pipePromise;
  }

  async function isAmharicLocalReady() {
    if (amharicLocalReady !== null)
      return amharicLocalReady;

    const bundleDir = path.isAbsolute(amharicModelId)
      ? amharicModelId
      : DEFAULT_AMHARIC_BUNDLE_DIR;

    await ensureAmharicOnnxBundleCompat(bundleDir);
    await ensureAmharicTokenizerCompat(bundleDir);
    amharicLocalReady =
      await amharicOnnxBundleReady(bundleDir);

    return amharicLocalReady;
  }

  async function getAmharicClassifier() {
    ensureCache();

    if (!amharicPipePromise) {
      const bundleDir = path.isAbsolute(amharicModelId)
        ? amharicModelId
        : DEFAULT_AMHARIC_BUNDLE_DIR;

      await ensureAmharicOnnxBundleCompat(bundleDir);
      await ensureAmharicTokenizerCompat(bundleDir);

      const loadHub = path.isAbsolute(amharicModelId)
        ? amharicModelId
        : AMHARIC_HATE_SPEECH_REPO;

      const dirName = path.isAbsolute(amharicModelId)
        ? path.basename(amharicModelId)
        : AMHARIC_BUNDLE_DIR_NAME;

      amharicPipePromise = loadPipeline(
        loadHub,
        dirName,
        bundleDir,
        false
      );
    }

    return amharicPipePromise;
  }

  /* ---------------- classification ---------------- */

  async function classifyDefault(text, threshold) {
    const classifier = await getClassifier();
    const raw = await classifier(text, {
      topk: null,
    });

    const results = Array.isArray(raw)
      ? raw
      : [raw];

    return resultFromLabels(results, threshold);
  }

  async function classifyAmharic(text, threshold) {
    if (await isAmharicLocalReady()) {
      const classifier =
        await getAmharicClassifier();

      const raw = await classifier(text, {
        topk: null,
      });

      const results = Array.isArray(raw)
        ? raw
        : [raw];

      // ✅ FIX: correct schema handling
      if (isBinaryAmharicModel(results)) {
        return normalizeAmharicResults(
          results,
          threshold
        );
      }

      return resultFromLabels(results, threshold);
    }

    if (hfApiToken) {
      try {
        const results =
          await classifyAmharicViaHfApi(
            text,
            hfApiToken,
            amharicModelId
          );

        return resultFromLabels(results, threshold);
      } catch (err) {
        console.warn(
          "[local-moderation] Amharic HF API unavailable, falling back to default model:",
          err
        );
      }
    }

    return classifyDefault(text, threshold);
  }

  async function classify(text, opts = {}) {
    const threshold =
      typeof opts.threshold === "number" &&
      Number.isFinite(opts.threshold)
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

    if (
      !amharicEnabled ||
      !containsAmharic(trimmed)
    ) {
      return classifyDefault(
        trimmed,
        threshold
      );
    }

    if (containsLatin(trimmed)) {
      const [a, b] = await Promise.all([
        classifyDefault(trimmed, threshold),
        classifyAmharic(trimmed, threshold),
      ]);

      return a.toxicityScore >= b.toxicityScore
        ? a
        : b;
    }

    return classifyAmharic(trimmed, threshold);
  }

  return {
    modelId,
    classify,
  };
}