import { createModerator } from "@safetext/local-moderation";
import { appConfig } from "../config/app.config.js";

export const localModerationEngine = createModerator({
  modelId: appConfig.localModerationModel,
  cacheDir: appConfig.transformersCacheDir?.trim() || null,
  onFirstLoad: (modelId) =>
    console.info(
      "[moderation:local] Loading model (first call may download ONNX weights):",
      modelId
    ),
});
