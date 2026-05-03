import { appConfig } from "../../config/app.config.js";

const lastSendByUser = new Map();

/**
 * @param {string} userId
 * @returns {{ ok: true } | { ok: false, waitMs: number }}
 */
export function takeModerationSendSlot(userId) {
  const minMs = appConfig.moderationMinSendIntervalMs;
  if (minMs <= 0) return { ok: true };

  const now = Date.now();
  const prev = lastSendByUser.get(userId) ?? 0;
  const elapsed = now - prev;
  if (elapsed < minMs) {
    return { ok: false, waitMs: minMs - elapsed };
  }
  lastSendByUser.set(userId, now);
  return { ok: true };
}
