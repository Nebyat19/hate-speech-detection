import { appConfig } from "../config/app.config.js";

export function publicApiAuthMiddleware(req, res, next) {
  const keys = appConfig.publicApiKeys;
  if (!keys.length) {
    return next();
  }

  const headerKey = req.get("x-api-key");
  const auth = req.get("authorization");
  const bearer =
    auth && auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const provided = headerKey || bearer;

  if (!provided || !keys.includes(provided)) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Provide a valid API key via X-API-Key or Authorization: Bearer <key>",
    });
  }

  next();
}
