import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createModerator, DEFAULT_LOCAL_MODERATION_MODEL } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const amharicModelPath = resolve(
  __dirname,
  "../.amharic-hate-speech"
);

function loadRootEnv() {
  const rootEnv = resolve(__dirname, "../../../../.env");
  if (!existsSync(rootEnv)) return;

  for (const line of readFileSync(rootEnv, "utf8").split("\n")) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadRootEnv();

const hfToken =
  process.env.HF_TOKEN ||
  process.env.HF_API_KEY ||
  "";

// simple Amharic detector (cheap but effective)
function isAmharic(text) {
  return /[\u1200-\u137F]/.test(text);
}

const useAmharicLocal = existsSync(amharicModelPath);

if (useAmharicLocal) {
  console.log("[smoke] loading local amharic model:", amharicModelPath);
} else {
  console.log("[smoke] local amharic model not found");
}

// Create moderator
const m = createModerator({
  amharicEnabled: true,
  amharicModelPath: useAmharicLocal ? amharicModelPath : null,
  hfApiToken: hfToken || null,
  onFirstLoad: (id) => console.log("[smoke] loading", id),
});

// wrap classify so we can enforce routing
const originalClassify = m.classify.bind(m);

m.classify = async (text, opts = {}) => {
  const threshold = opts.threshold ?? 0.5;

  const result = await originalClassify(text, opts);

  // IMPORTANT: force routing awareness (debug visibility)
  console.log("[route]", {
    text,
    isAmharic: isAmharic(text),
    score: result.toxicityScore
  });

  return result;
};

const samples = [
  "hello",
  "you are stupid",
  "አንተ በጣም ደደብ ነህ",
  "hello አንተ ደደብ",
];

console.log("[smoke] default model id:", DEFAULT_LOCAL_MODERATION_MODEL);
console.log("[smoke] amharic via:", hfToken ? "HF API or local ONNX" : "local ONNX only");

for (const s of samples) {
  console.log(s, await m.classify(s, { threshold: 0.5 }));
}