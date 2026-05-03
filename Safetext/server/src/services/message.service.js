import { prisma } from "../db/client.js";
import { deriveStatusLabel } from "./user.service.js";
import { riskTierFromComposite, userCompositeRisk } from "../utils/riskTier.js";

export async function createMessage(userId, content, status, toxicityScore) {
  return prisma.message.create({
    data: {
      userId,
      content,
      status,
      toxicityScore: toxicityScore ?? null,
    },
    include: { user: true },
  });
}

export async function recentApproved(limit = 80) {
  return prisma.message.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  });
}

export async function getMessageById(id) {
  return prisma.message.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function countFlaggedMessagesByUser(userId) {
  return prisma.message.count({
    where: { userId, status: "FLAGGED" },
  });
}

export async function recentFlagged(limit = 40) {
  return prisma.message.findMany({
    where: { status: "FLAGGED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  });
}

export async function aggregateStats() {
  const [activeUsers, totalMessages, flaggedMessages, reportedMessages, escalatedUsers] =
    await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.message.count(),
      prisma.message.count({ where: { status: "FLAGGED" } }),
      prisma.report.count(),
      prisma.user.count({ where: { status: "ESCALATED" } }),
    ]);

  return {
    activeUsers,
    totalMessages,
    flaggedMessages,
    reportedMessages,
    escalatedUsers,
  };
}

export async function listUsersLive() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const reportRows = await prisma.report.findMany({
    select: { message: { select: { userId: true } } },
  });
  const reportsByUser = new Map();
  for (const row of reportRows) {
    const uid = row.message.userId;
    reportsByUser.set(uid, (reportsByUser.get(uid) ?? 0) + 1);
  }

  const toxicAgg = await prisma.message.groupBy({
    by: ["userId"],
    where: { status: "FLAGGED" },
    _count: { id: true },
  });
  const toxicByUser = new Map(toxicAgg.map((t) => [t.userId, t._count.id]));

  return users.map((u) => {
    const reports = reportsByUser.get(u.id) ?? 0;
    const toxicMessages = toxicByUser.get(u.id) ?? 0;
    const composite = userCompositeRisk(u, reports, toxicMessages);
    const riskTier = riskTierFromComposite(composite);

    return {
      id: u.id,
      displayName: u.displayName,
      strikeCount: u.strikeCount,
      reports,
      toxicMessages,
      riskLevel: u.riskScore,
      riskTier,
      compositeRisk: composite,
      status: deriveStatusLabel(u),
      muted: u.muted,
      sessionId: u.sessionId,
      createdAt: u.createdAt,
    };
  });
}
