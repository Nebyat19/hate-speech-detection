import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** HF repo: AmRoBERTa fine-tuned on Amharic hate speech (binary hate / not-hate). */
export const AMHARIC_HATE_SPEECH_REPO = "uhhlt/amharic-hate-speech";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.join(__dirname, "..");

export const AMHARIC_BUNDLE_DIR_NAME = ".amharic-hate-speech";
export const DEFAULT_AMHARIC_BUNDLE_DIR = path.join(PKG_ROOT, AMHARIC_BUNDLE_DIR_NAME);

const HF_INFERENCE_URL = `https://api-inference.huggingface.co/models/${AMHARIC_HATE_SPEECH_REPO}`;

/**
 * @param {string} modelDir
 * @returns {Promise<boolean>}
 */
export async function amharicOnnxBundleReady(modelDir = DEFAULT_AMHARIC_BUNDLE_DIR) {
  try {
    const st = await fs.stat(path.join(modelDir, "model.onnx"));
    return st.size > 100_000;
  } catch {
    return false;
  }
}

/**
 * Ensure the bundle also exposes the ONNX file where Transformers.js expects it.
 *
 * @param {string} modelDir
 * @returns {Promise<boolean>}
 */
export async function ensureAmharicOnnxBundleCompat(
  modelDir = DEFAULT_AMHARIC_BUNDLE_DIR
) {
  const legacyModelPath = path.join(modelDir, "model.onnx");
  const compatModelPath = path.join(modelDir, "onnx", "model.onnx");

  try {
    await fs.stat(compatModelPath);
    return true;
  } catch {
    // Fall through and create the compatibility link if the legacy file exists.
  }

  try {
    await fs.stat(legacyModelPath);
  } catch {
    return false;
  }

  await fs.mkdir(path.dirname(compatModelPath), { recursive: true });

  try {
    await fs.symlink(path.join("..", "model.onnx"), compatModelPath);
  } catch {
    return false;
  }

  return true;
}

/**
 * Normalize the exported tokenizer format for Transformers.js.
 *
 * @param {string} modelDir
 * @returns {Promise<boolean>}
 */
export async function ensureAmharicTokenizerCompat(
  modelDir = DEFAULT_AMHARIC_BUNDLE_DIR
) {
  const tokenizerPath = path.join(modelDir, "tokenizer.json");

  let raw;
  try {
    raw = await fs.readFile(tokenizerPath, "utf8");
  } catch {
    return false;
  }

  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch {
    return false;
  }

  const merges = cfg?.model?.merges;
  if (!Array.isArray(merges) || !Array.isArray(merges[0])) {
    return true;
  }

  cfg.model.merges = merges.map((pair) => pair.join(" "));
  await fs.writeFile(tokenizerPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
  return true;
}

/**
 * @param {string} token
 * @param {string} text
 * @param {string} [modelId]
 * @returns {Promise<{ label: string, score: number }[]>}
 */
export async function classifyAmharicViaHfApi(text, token, modelId = AMHARIC_HATE_SPEECH_REPO) {
  const url =
    modelId === AMHARIC_HATE_SPEECH_REPO
      ? HF_INFERENCE_URL
      : `https://api-inference.huggingface.co/models/${modelId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HF inference failed ${res.status}: ${body.slice(0, 200)}`);
  }

  /** @type {{ label: string, score: number }[] | { label: string, score: number }[][]} */
  const data = await res.json();
  const rows = Array.isArray(data?.[0]) ? data[0] : data;
  if (!Array.isArray(rows)) {
    throw new Error("HF inference returned unexpected payload");
  }
  return rows.map((r) => ({
    label: String(r.label ?? ""),
    score: Math.min(1, Math.max(0, Number(r.score) || 0)),
  }));
}
