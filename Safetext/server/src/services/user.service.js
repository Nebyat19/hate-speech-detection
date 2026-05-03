import { randomUUID } from "node:crypto";
import { prisma } from "../db/client.js";
import { appConfig } from "../config/app.config.js";
import { sendModeratorEmail } from "./email.service.js";

const ADJECTIVES = [
  "Swift",
  "Bright",
  "Calm",
  "Brave",
  "Gentle",
  "Noble",
  "Keen",
  "Wise",
  "Quick",
  "Kind",
];
const NOUNS = [
  "Falcon",
  "River",
  "Cedar",
  "Harbor",
  "Atlas",
  "Comet",
  "Lotus",
  "Summit",
  "Glacier",
  "Echo",
];

const COLORS = [
  "#7c3aed",
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#0891b2",
  "#4f46e5",
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeDisplayName() {
  return `${randomChoice(ADJECTIVES)}${randomChoice(NOUNS)}${Math.floor(100 + Math.random() * 900)}`;
}

function makeSessionId() {
  return `sg_${randomUUID()}`;
}

export function deriveStatusLabel(user) {
  if (user.status === "ESCALATED") return "Escalated";
  if (user.muted) return "Muted";
  if (user.status === "HIGH_RISK" || user.riskScore >= 5 || user.strikeCount >= 2) {
    return "High Risk";
  }
  if (user.strikeCount >= 1) return "Warning";
  return "Safe";
}

function recomputeDbStatus(strikeCount, riskScore) {
  if (strikeCount >= appConfig.maxStrikes) return "ESCALATED";
  if (riskScore >= 5 || strikeCount >= 2) return "HIGH_RISK";
  if (strikeCount >= 1) return "WARNING";
  return "SAFE";
}

export async function getUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findOrCreateGuest(sessionId) {
  if (sessionId) {
    const existing = await prisma.user.findUnique({ where: { sessionId } });
    if (existing) return existing;
  }

  const sid = sessionId || makeSessionId();
  return prisma.user.create({
    data: {
      sessionId: sid,
      displayName: makeDisplayName(),
      avatarColor: randomChoice(COLORS),
      strikeCount: 0,
      riskScore: 0,
      status: "SAFE",
      muted: false,
    },
  });
}

export async function applyFlaggedStrike(userId, mod) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { strikeCount: { increment: 1 } },
  });

  const nextStatus = recomputeDbStatus(user.strikeCount, user.riskScore);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      status: nextStatus,
      muted:
        nextStatus === "ESCALATED" && appConfig.muteOnEscalation ? true : user.muted,
    },
  });

  if (nextStatus === "ESCALATED" && user.status !== "ESCALATED") {
    const cats = mod.flaggedCategories ?? [];
    await sendModeratorEmail({
      subject: `[${appConfig.appName}] User escalated — review required`,
      text: `User ${updated.displayName} (${updated.id}) reached max strikes (${appConfig.maxStrikes}).\nSession: ${updated.sessionId}\nLatest moderation categories: ${cats.join(", ") || "n/a"}\nToxicity score: ${mod.toxicityScore}`,
    });
  }

  return updated;
}

export async function bumpRiskScore(userId, delta = 1) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { riskScore: { increment: delta } },
  });
  const nextStatus = recomputeDbStatus(user.strikeCount, user.riskScore);
  return prisma.user.update({
    where: { id: userId },
    data: { status: nextStatus },
  });
}
