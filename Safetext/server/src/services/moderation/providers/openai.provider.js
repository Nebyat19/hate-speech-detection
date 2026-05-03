import { appConfig } from "../../../config/app.config.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} text
 * @returns {{ code: string | null, type: string | null, message: string | null }}
 */
function parseOpenAIErrorJson(text) {
  try {
    const j = JSON.parse(text);
    const err = j.error;
    return {
      code: typeof err?.code === "string" ? err.code : null,
      type: typeof err?.type === "string" ? err.type : null,
      message: typeof err?.message === "string" ? err.message : null,
    };
  } catch {
    return { code: null, type: null, message: null };
  }
}

/**
 * @param {Response} res
 * @returns {number}
 */
function retryAfterMs(res) {
  const h = res.headers.get("retry-after");
  if (!h) return 0;
  const seconds = Number.parseInt(h, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(appConfig.openaiModerationRetryCapMs, seconds * 1000);
  }
  const date = Date.parse(h);
  if (Number.isFinite(date)) {
    const wait = date - Date.now();
    return wait > 0 ? Math.min(appConfig.openaiModerationRetryCapMs, wait) : 0;
  }
  return 0;
}

/**
 * OpenAI returns 429 for both "too many requests" and "insufficient quota / no billing".
 * Retries only help the former.
 *
 * @param {string} text
 * @param {string} key
 */
async function moderationFetchOnce(text, key) {
  const body = { input: text };
  if (appConfig.moderationModel?.trim()) {
    body.model = appConfig.moderationModel.trim();
  }

  return fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * @param {any} data
 * @returns {import('../types.js').ModerationResult}
 */
function parseModerationJson(data) {
  const result = data.results?.[0];
  if (!result) {
    throw new Error("OpenAI moderation returned no results");
  }

  const categoryScores = result.category_scores || {};
  const categoryBools = result.categories || {};
  const flagged = Boolean(result.flagged);
  const entries = Object.entries(categoryScores);
  const maxScore = entries.length
    ? Math.max(...entries.map(([, v]) => Number(v) || 0))
    : 0;

  const threshold = appConfig.moderationFlagThreshold;
  const fromThreshold = entries
    .filter(([, score]) => Number(score) >= threshold)
    .map(([name]) => name);
  const fromBooleans = Object.entries(categoryBools)
    .filter(([, v]) => v)
    .map(([name]) => name);
  const flaggedCategories = [...new Set([...fromThreshold, ...fromBooleans])];

  const unsafeByModel = flagged || flaggedCategories.length > 0;
  const safe = !unsafeByModel;

  return {
    safe,
    toxicityScore: Math.min(1, maxScore),
    flaggedCategories,
    scoresByCategory: Object.fromEntries(entries.map(([k, v]) => [k, Number(v) || 0])),
  };
}

function userFacing429Message(apiCode, apiType, apiMessage) {
  if (apiCode === "insufficient_quota" || apiType === "insufficient_quota") {
    return (
      "OpenAI reports insufficient_quota (HTTP 429). This is billing/credits, not “too many chat messages.” " +
      "Open https://platform.openai.com/account/billing and ensure the project has budget and a payment method if required."
    );
  }
  if (apiCode === "rate_limit_exceeded") {
    return (
      "OpenAI rate_limit_exceeded. Wait briefly, or raise limits at https://platform.openai.com/account/limits"
    );
  }
  return (
    `OpenAI returned HTTP 429 (“Too Many Requests”). If this happens on your first message, it is almost never ${appConfig.appName}’s fault. ` +
    "Typical causes: (1) no credits or hard usage cap in Billing, (2) org/project limits set very low, " +
    "(3) this API key was leaked or shared—create a new key at https://platform.openai.com/api-keys and rotate it in .env. " +
    "Try MODERATION_MODEL=text-moderation-latest in server/.env . Check server logs for the full JSON error."
  );
}

/**
 * @param {string} text
 * @returns {Promise<import('../types.js').ModerationResult>}
 */
export async function moderateWithOpenAI(text) {
  const key = appConfig.openaiApiKey;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required when using the OpenAI moderation provider");
  }

  const maxAttempts = Math.max(1, appConfig.openaiModerationMaxAttempts);
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await moderationFetchOnce(text, key);
    lastStatus = res.status;

    if (res.ok) {
      const data = await res.json();
      return parseModerationJson(data);
    }

    lastBody = await res.text();
    const { code: errCode, type: errType, message: errMsg } = parseOpenAIErrorJson(lastBody);

    if (lastStatus === 429 && (errCode === "insufficient_quota" || errType === "insufficient_quota")) {
      console.warn("[moderation] OpenAI 429 insufficient_quota (fix billing, not message rate):", errMsg);
      throw new Error(userFacing429Message(errCode, errType, errMsg));
    }

    console.warn(`[moderation] OpenAI ${lastStatus}:`, errCode || errType || "", errMsg || lastBody.slice(0, 200));

    const retriable =
      ((lastStatus === 429 && errCode !== "insufficient_quota" && errType !== "insufficient_quota") ||
        lastStatus === 503) &&
      attempt < maxAttempts - 1;

    if (!retriable) {
      break;
    }

    const fromHeader = retryAfterMs(res);
    const exponential = Math.min(
      appConfig.openaiModerationRetryCapMs,
      1000 * 2 ** attempt + Math.random() * 400
    );
    const waitMs = Math.max(fromHeader, exponential);
    await sleep(waitMs);
  }

  if (lastStatus === 429) {
    const { code, type, message } = parseOpenAIErrorJson(lastBody);
    throw new Error(userFacing429Message(code, type, message));
  }

  throw new Error(`OpenAI moderation failed: ${lastStatus} ${lastBody}`);
}
