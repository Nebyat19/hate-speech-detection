import { appConfig } from "../../../config/app.config.js";
import { localModerationEngine } from "../../localModerationEngine.js";

/**
 * @param {string} text
 * @returns {Promise<import('../types.js').ModerationResult>}
 */
export async function moderateWithLocal(text) {
  return localModerationEngine.classify(text, { threshold: appConfig.moderationFlagThreshold });
}
