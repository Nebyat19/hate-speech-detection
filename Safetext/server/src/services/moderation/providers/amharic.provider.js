import { createModerator } from "@safetext/local-moderation";
import { appConfig } from "../../../config/app.config.js";

const amharicEngine = createModerator({
  modelId: appConfig.localModerationModel,
  amharicEnabled: true,
  amharicModelId: appConfig.amharicModerationModel,
  hfApiToken: appConfig.hfApiToken?.trim() || null,
  cacheDir: appConfig.transformersCacheDir?.trim() || null,
});

/**
 * @param {string} text
 * @returns {Promise<import('../types.js').ModerationResult>}
 */
export async function moderateWithAmharicModel(text) {
  return amharicEngine.classify(text, { threshold: appConfig.moderationFlagThreshold });
}
