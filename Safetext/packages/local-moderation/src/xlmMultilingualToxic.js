import fs from "node:fs/promises";
import path from "node:path";

/** HF repo: ONNX XLM-RoBERTa multilingual toxicity (detoxify-style multi-label). */
export const XLM_MULTILINGUAL_TOXIC_REPO =
  "hoan/multilingual-toxic-xlm-roberta-dynamic-quantized";

const HF_MAIN = `https://huggingface.co/${XLM_MULTILINGUAL_TOXIC_REPO}/resolve/main`;

/** Label order from model card (detoxify multilingual). */
export const DETOXIFY_MULTILINGUAL_LABELS = [
  "toxicity",
  "severe_toxicity",
  "obscene",
  "identity_attack",
  "insult",
  "threat",
  "sexual_explicit",
  "male",
  "female",
  "homosexual_gay_or_lesbian",
  "christian",
  "jewish",
  "muslim",
  "black",
  "white",
  "psychiatric_or_mental_illness",
];

const CORE_TOXICITY_LABELS = new Set(DETOXIFY_MULTILINGUAL_LABELS.slice(0, 7));

/**
 * @param {string} label
 * @returns {string}
 */
export function normalizeDetoxifyLabel(label) {
  const s = String(label ?? "").trim();
  const m = /^LABEL_(\d+)$/i.exec(s);
  if (!m) return s;
  const idx = Number(m[1]);
  return DETOXIFY_MULTILINGUAL_LABELS[idx] ?? s;
}

/**
 * @param {{ label: string, score: number }[]} results
 * @returns {{ label: string, score: number }[]}
 */
export function normalizeClassificationResults(results) {
  return results.map((r) => ({
    label: normalizeDetoxifyLabel(r.label),
    score: Math.min(1, Math.max(0, Number(r.score) || 0)),
  }));
}

/**
 * Max sigmoid score over core toxicity dimensions (excludes identity-mention heads).
 *
 * @param {{ label: string, score: number }[]} normalized
 * @returns {number}
 */
export function coreDetoxifyToxicityScore(normalized) {
  let max = 0;
  for (const r of normalized) {
    if (CORE_TOXICITY_LABELS.has(r.label)) max = Math.max(max, r.score);
  }
  return max;
}

/**
 * @param {{ label: string, score: number }[]} normalized
 * @returns {boolean}
 */
export function looksLikeDetoxifyMultilingual(normalized) {
  if (normalized.length < 12) return false;
  return normalized.some((r) => CORE_TOXICITY_LABELS.has(r.label));
}

/**
 * @param {{ label: string, score: number }[]} normalized
 * @returns {string}
 */
export function primaryCoreToxicityLabel(normalized) {
  let best = "toxicity";
  let bestScore = -1;
  for (const r of normalized) {
    if (CORE_TOXICITY_LABELS.has(r.label) && r.score > bestScore) {
      bestScore = r.score;
      best = r.label;
    }
  }
  return best;
}

/** Remote basename → relative path under model dir (Transformers.js expects onnx/). */
const BUNDLE_FILES = [
  ["config.json", "config.json"],
  ["tokenizer_config.json", "tokenizer_config.json"],
  ["tokenizer.json", "tokenizer.json"],
  ["sentencepiece.bpe.model", "sentencepiece.bpe.model"],
  ["special_tokens_map.json", "special_tokens_map.json"],
  ["model_quantized.onnx", path.join("onnx", "model_quantized.onnx")],
];

async function downloadFile(url, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

/**
 * Ensure a local directory layout compatible with @xenova/transformers (onnx/model_quantized.onnx).
 *
 * @param {string} modelDir absolute path
 * @param {{ silent?: boolean }} [opts]
 */
export async function ensureXlmMultilingualOnnxBundle(modelDir, opts = {}) {
  const onnxFile = path.join(modelDir, "onnx", "model_quantized.onnx");
  let needDownload = true;
  try {
    const st = await fs.stat(onnxFile);
    needDownload = st.size < 1_000_000;
  } catch {
    needDownload = true;
  }

  if (needDownload) {
    if (!opts.silent) {
      console.info(
        "[local-moderation] Downloading XLM-R multilingual toxicity ONNX (first run, ~280MB)…"
      );
    }
    for (const [remoteBase, relDest] of BUNDLE_FILES) {
      const dest = path.join(modelDir, relDest);
      await downloadFile(`${HF_MAIN}/${remoteBase}`, dest);
    }
  }

  const cfgPath = path.join(modelDir, "config.json");
  const raw = await fs.readFile(cfgPath, "utf8");
  const cfg = JSON.parse(raw);
  if (cfg.problem_type !== "multi_label_classification") {
    cfg.problem_type = "multi_label_classification";
    await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2), "utf8");
  }
}
