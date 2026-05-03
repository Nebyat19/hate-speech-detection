import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appNameRaw = String(process.env.APP_NAME ?? "Safetext").trim();
const appName = appNameRaw || "Safetext";

function loadPlatformFile() {
  const raw = readFileSync(path.join(__dirname, "platform.config.json"), "utf8");
  return JSON.parse(raw);
}

const platform = loadPlatformFile();

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (v, fallback) => {
  if (v === undefined || v === "") return fallback;
  return String(v).toLowerCase() === "true" || v === "1";
};

function normalizeProvider(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "local" || s === "xenova" || s === "onnx") return "local";
  if (s === "google-perspective") return "google-perspective";
  if (s === "custom-amharic") return "custom-amharic";
  return "openai";
}

const providerFromEnv = process.env.MODERATION_PROVIDER;
/** @type {import('../services/moderation/types.js').ModerationProviderId} */
const provider = providerFromEnv
  ? normalizeProvider(providerFromEnv)
  : normalizeProvider(platform.provider);

export const appConfig = {
  appName,
  provider,
  maxStrikes: num(process.env.MAX_STRIKES, num(platform.maxStrikes, 3)),
  moderationFlagThreshold: num(process.env.MODERATION_FLAG_THRESHOLD, 0.5),
  moderationModel: process.env.MODERATION_MODEL || "text-moderation-latest",
  emailEnabled: bool(process.env.EMAIL_ENABLED, Boolean(platform.emailEnabled)),
  multilingualEnabled: bool(
    process.env.MULTILINGUAL_ENABLED,
    Boolean(platform.multilingualEnabled)
  ),
  muteOnEscalation: bool(process.env.MUTE_ON_ESCALATION, false),
  port: num(process.env.PORT, 3001),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModerationMaxAttempts: num(process.env.OPENAI_MOD_MAX_ATTEMPTS, 6),
  openaiModerationRetryCapMs: num(process.env.OPENAI_MOD_RETRY_CAP_MS, 60000),
  moderationMinSendIntervalMs: num(process.env.MOD_MIN_SEND_INTERVAL_MS, 800),
  localModerationModel: process.env.LOCAL_MODERATION_MODEL || "Xenova/toxic-bert",
  transformersCacheDir: process.env.TRANSFORMERS_CACHE || "",
  publicApiKeys: (process.env.PUBLIC_API_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  publicApiMaxTextChars: num(process.env.PUBLIC_API_MAX_TEXT_CHARS, 8000),
  publicApiRateWindowMs: num(process.env.PUBLIC_API_RATE_WINDOW_MS, 60_000),
  publicApiRateMax: num(process.env.PUBLIC_API_RATE_MAX, 120),
  publicApiCorsAllowAll: bool(process.env.PUBLIC_API_CORS_ALLOW_ALL, true),
  publicApiCorsExtraOrigins: (process.env.PUBLIC_API_CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  email: {
    host: process.env.SMTP_HOST,
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    moderatorEmail: process.env.MODERATOR_EMAIL || "moderator@example.com",
    from: process.env.EMAIL_FROM || `${appName} <noreply@localhost.local>`,
  },
};
