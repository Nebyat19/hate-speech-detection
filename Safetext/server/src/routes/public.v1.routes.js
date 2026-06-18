import { Router } from "express";
import rateLimit from "express-rate-limit";
import { appConfig } from "../config/app.config.js";
import { publicApiAuthMiddleware } from "../middleware/publicApiAuth.middleware.js";
import {
  buildOpenAIModerationResponse,
  normalizeModerationInputs,
} from "../services/openaiCompatibleModeration.js";
import { localModerationEngine } from "../services/localModerationEngine.js";

const router = Router();

const limiter = rateLimit({
  windowMs: appConfig.publicApiRateWindowMs,
  max: appConfig.publicApiRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit", message: "Too many requests. Try again later." },
});

router.use(limiter);
router.use(publicApiAuthMiddleware);

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Safetext-public-v1",
    model: appConfig.localModerationModel,
    amharicModel: appConfig.amharicModerationModel,
  });
});

/**
 * POST /v1/moderations — OpenAI-compatible (same JSON shape as OpenAI moderation).
 * Body: { "input": "string" | ["a","b"], "model"?: string }
 */
router.post("/moderations", async (req, res, next) => {
  try {
    const inputs = normalizeModerationInputs(req.body?.input);
    if (!inputs.length) {
      return res.status(400).json({
        error: {
          type: "invalid_request_error",
          message: "Missing required parameter: `input`.",
        },
      });
    }

    for (const str of inputs) {
      if (str.length > appConfig.publicApiMaxTextChars) {
        return res.status(400).json({
          error: {
            type: "invalid_request_error",
            message: `Each input must be at most ${appConfig.publicApiMaxTextChars} characters.`,
          },
        });
      }
    }

    const classifyResults = [];
    for (const str of inputs) {
      classifyResults.push(
        await localModerationEngine.classify(str, {
          threshold: appConfig.moderationFlagThreshold,
        })
      );
    }

    const model =
      typeof req.body?.model === "string" && req.body.model.trim()
        ? req.body.model.trim()
        : appConfig.localModerationModel;

    res.json(buildOpenAIModerationResponse(model, classifyResults));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/moderate
 * Body: { "text": "..." }
 */
router.post("/moderate", async (req, res, next) => {
  try {
    const text = req.body?.text;
    if (text === undefined || text === null) {
      return res.status(400).json({
        error: "bad_request",
        message: 'JSON body must include a string "text" field.',
      });
    }

    const str = String(text);
    if (str.length > appConfig.publicApiMaxTextChars) {
      return res.status(400).json({
        error: "bad_request",
        message: `Text exceeds max length (${appConfig.publicApiMaxTextChars} characters).`,
      });
    }

    const result = await localModerationEngine.classify(str, {
      threshold: appConfig.moderationFlagThreshold,
    });

    res.json({
      model: appConfig.localModerationModel,
      ...result,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
