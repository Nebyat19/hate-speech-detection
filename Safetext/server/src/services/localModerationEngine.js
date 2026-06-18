import { createModerator } from "@safetext/local-moderation";
import { appConfig } from "../config/app.config.js";

export const localModerationEngine = createModerator({
  modelId: appConfig.localModerationModel,
  amharicEnabled: appConfig.multilingualEnabled,
  amharicModelId: appConfig.amharicModerationModel,
  hfApiToken: appConfig.hfApiToken?.trim() || null,
  cacheDir: appConfig.transformersCacheDir?.trim() || null,
  onFirstLoad: (modelId) =>
    console.info(
      "[moderation:local] Loading model (first call may download ONNX weights):",
      modelId
    ),
});
