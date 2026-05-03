import { prisma } from "../db/client.js";

export async function countReportsAgainstAuthor(userId) {
  return prisma.report.count({
    where: { message: { userId } },
  });
}

/** @type {Set<string>} */
export const REPORT_REASONS = new Set([
  "hate speech",
  "harassment",
  "spam",
  "threat",
  "other",
]);

export async function createReport(messageId, reporterId, reason) {
  const normalized = String(reason || "")
    .toLowerCase()
    .trim();
  if (!REPORT_REASONS.has(normalized)) {
    throw new Error("Invalid report reason");
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found");
  if (message.userId === reporterId) {
    throw new Error("Cannot report your own message");
  }

  const existing = await prisma.report.findFirst({
    where: { messageId, reporterId },
  });
  if (existing) {
    return { report: existing, duplicate: true };
  }

  const report = await prisma.report.create({
    data: {
      messageId,
      reporterId,
      reason: normalized,
    },
  });

  return { report, duplicate: false };
}
