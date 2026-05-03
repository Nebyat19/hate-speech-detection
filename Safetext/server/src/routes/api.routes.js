import { Router } from "express";
import * as messageService from "../services/message.service.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Safetext-api" });
});

router.get("/stats", async (_req, res, next) => {
  try {
    const stats = await messageService.aggregateStats();
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

router.get("/users/live", async (_req, res, next) => {
  try {
    const users = await messageService.listUsersLive();
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

export default router;
