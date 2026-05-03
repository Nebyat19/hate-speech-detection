import { runProvider } from "./providers/index.js";

/**
 * Provider-based moderation entrypoint. Frontend never depends on which backend runs.
 * @param {string} message
 * @returns {Promise<import('./types.js').ModerationResult>}
 */
export async function check(message) {
  const trimmed = String(message ?? "").trim();
  if (!trimmed) {
    return { safe: true, toxicityScore: 0, flaggedCategories: [] };
  }
  return runProvider(trimmed);
}
