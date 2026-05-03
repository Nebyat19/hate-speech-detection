import { appConfig } from "../../../config/app.config.js";
import { moderateWithOpenAI } from "./openai.provider.js";
import { moderateWithLocal } from "./local.provider.js";
import { moderateWithPerspective } from "./perspective.provider.js";
import { moderateWithAmharicModel } from "./amharic.provider.js";

/** @type {Record<import('../types.js').ModerationProviderId, (text: string) => Promise<import('../types.js').ModerationResult>>} */
const registry = {
  openai: moderateWithOpenAI,
  local: moderateWithLocal,
  "google-perspective": moderateWithPerspective,
  "custom-amharic": moderateWithAmharicModel,
};

/**
 * @param {string} text
 * @returns {Promise<import('../types.js').ModerationResult>}
 */
export async function runProvider(text) {
  const run = registry[appConfig.provider] ?? registry.local;
  return run(text);
}
