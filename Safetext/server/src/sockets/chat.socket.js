import { appConfig } from "../config/app.config.js";
import {
  POLICY_REFERENCE,
  formatViolationCategories,
  approvedBadgeKind,
} from "../utils/moderationDisplay.js";
import { riskTierFromComposite, userCompositeRisk } from "../utils/riskTier.js";
import * as moderationService from "../services/moderation.service.js";
import { takeModerationSendSlot } from "../services/moderation/moderationPacing.js";
import * as userService from "../services/user.service.js";
import * as messageService from "../services/message.service.js";
import * as reportService from "../services/report.service.js";

const onlineByUser = new Map();

function bumpPresence(userId, delta, profileIfInc) {
  const cur = onlineByUser.get(userId);
  if (delta > 0 && profileIfInc) {
    const n = (cur?.n ?? 0) + 1;
    onlineByUser.set(userId, {
      displayName: profileIfInc.displayName ?? cur?.displayName ?? "Member",
      avatarColor: profileIfInc.avatarColor ?? cur?.avatarColor ?? "#64748b",
      n,
    });
    return;
  }
  if (delta < 0 && cur) {
    const n = cur.n - 1;
    if (n <= 0) onlineByUser.delete(userId);
    else onlineByUser.set(userId, { ...cur, n });
  }
}

function snapshotOnlineUsers() {
  return [...onlineByUser.entries()].map(([id, v]) => ({
    id,
    displayName: v.displayName,
    avatarColor: v.avatarColor,
  }));
}

function broadcastPresence(io) {
  io.to("community_chat").emit("online_users", snapshotOnlineUsers());
}

function serializeMessage(row, extras = {}) {
  const threshold = appConfig.moderationFlagThreshold;
  const tox = row.toxicityScore != null ? Number(row.toxicityScore) : 0;
  const moderationBadge =
    row.status === "APPROVED" ? approvedBadgeKind(tox, threshold) : "blocked";
  const categoryLabel =
    extras.categoryLabel ?? (row.status === "APPROVED" ? "None" : "Flagged");
  return {
    id: row.id,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    toxicityScore: tox,
    moderationBadge,
    categoryLabel,
    moderationAction: row.status === "APPROVED" ? "Delivered" : "Blocked",
    user: {
      id: row.user.id,
      displayName: row.user.displayName,
      avatarColor: row.user.avatarColor,
    },
  };
}

function serializeFlaggedForModerator(row) {
  const tox = row.toxicityScore != null ? Number(row.toxicityScore) : 0;
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    toxicityScore: tox,
    categoryLabel: "Historical (categories not stored)",
    user: {
      id: row.user.id,
      displayName: row.user.displayName,
      avatarColor: row.user.avatarColor,
    },
  };
}

export async function pushModeratorDashboard(io) {
  const [stats, users] = await Promise.all([
    messageService.aggregateStats(),
    messageService.listUsersLive(),
  ]);
  io.to("moderators").emit("stats_update", stats);
  io.to("moderators").emit("users_table_update", users);
}

async function pushModeratorInitialFeed(socket) {
  const [recentApproved, recentFlagged] = await Promise.all([
    messageService.recentApproved(50),
    messageService.recentFlagged(40),
  ]);
  const chronological = [...recentApproved].reverse();
  socket.emit("mod_initial", {
    liveFeed: chronological.map((r) => serializeMessage(r)),
    flaggedQueue: recentFlagged.map((r) => serializeFlaggedForModerator(r)),
  });
}

export function registerChatSockets(io) {
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      const uid = socket.data.userId;
      if (!uid) return;
      bumpPresence(uid, -1, null);
      broadcastPresence(io);
    });

    socket.on("mod:subscribe", async () => {
      socket.join("moderators");
      await pushModeratorDashboard(io);
      await pushModeratorInitialFeed(socket);
    });

    socket.on("chat:join", async (payload) => {
      try {
        const sessionId = payload?.sessionId ? String(payload.sessionId) : "";
        const user = await userService.findOrCreateGuest(sessionId);
        socket.data.userId = user.id;
        socket.data.sessionId = user.sessionId;

        socket.join("community_chat");
        bumpPresence(user.id, 1, {
          displayName: user.displayName,
          avatarColor: user.avatarColor,
        });
        broadcastPresence(io);

        const [reports, toxicMessages] = await Promise.all([
          reportService.countReportsAgainstAuthor(user.id),
          messageService.countFlaggedMessagesByUser(user.id),
        ]);
        const composite = userCompositeRisk(user, reports, toxicMessages);
        const riskTier = riskTierFromComposite(composite);

        socket.emit("session_ready", {
          user: {
            id: user.id,
            displayName: user.displayName,
            avatarColor: user.avatarColor,
            sessionId: user.sessionId,
            strikeCount: user.strikeCount,
            muted: user.muted,
            riskScore: user.riskScore,
            status: userService.deriveStatusLabel(user),
            maxStrikes: appConfig.maxStrikes,
            moderationFlagThreshold: appConfig.moderationFlagThreshold,
            compositeRisk: composite,
            riskTier,
            reports,
            toxicMessages,
          },
        });

        const recentApprovedRows = await messageService.recentApproved(80);
        const recentFlaggedRows = await messageService.recentFlagged(40);

        const approvedMsgs = [...recentApprovedRows]
          .reverse()
          .map((r) => serializeMessage(r));
        const noticeItems = [...recentFlaggedRows].reverse().map((row) => ({
          id: row.id,
          messageKind: "moderation_notice",
          createdAt: row.createdAt,
          user: {
            id: row.user.id,
            displayName: row.user.displayName,
            avatarColor: row.user.avatarColor,
          },
          categoryLabel: "Policy-violating content",
          policyReference: POLICY_REFERENCE,
        }));

        const merged = [...approvedMsgs, ...noticeItems].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        socket.emit("message_history", { messages: merged });

        socket.emit("online_users", snapshotOnlineUsers());
      } catch (e) {
        socket.emit("error", { message: e.message || "Join failed" });
      }
    });

    socket.on("send_message", async (payload) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("error", { message: "Join chat before sending messages" });
        return;
      }

      const content = String(payload?.content ?? "").trim();
      if (!content) return;

      try {
        const user = await userService.getUserById(userId);
        if (!user) {
          socket.emit("error", { message: "User not found" });
          return;
        }
        if (user.muted) {
          socket.emit("message_blocked", {
            warning:
              "Your account is temporarily muted. Please contact a moderator if this is a mistake.",
            action: "Blocked",
            policyReference: POLICY_REFERENCE,
            categoryLabel: "Account restriction",
            toxicityScore: null,
            userStatus: userService.deriveStatusLabel(user),
          });
          return;
        }

        const slot = takeModerationSendSlot(userId);
        if (!slot.ok) {
          socket.emit("error", {
            message: `Please wait ${Math.ceil(slot.waitMs / 1000)}s before sending another message.`,
          });
          return;
        }

        let mod;
        try {
          mod = await moderationService.check(content);
        } catch (err) {
          socket.emit("error", {
            message: err.message || "Moderation service unavailable. Try again shortly.",
          });
          return;
        }

        const threshold = appConfig.moderationFlagThreshold;

        if (mod.safe) {
          const saved = await messageService.createMessage(
            userId,
            content,
            "APPROVED",
            mod.toxicityScore
          );
          const payloadOut = serializeMessage(saved, { categoryLabel: "None" });
          socket.emit("message_approved", {
            summary: "Message approved",
            toxicityScore: mod.toxicityScore,
            categories: mod.flaggedCategories ?? [],
            categoryLabel: "None",
            badge: approvedBadgeKind(mod.toxicityScore, threshold),
          });
          io.emit("new_message", payloadOut);
          io.to("moderators").emit("mod_feed_append", payloadOut);
          await pushModeratorDashboard(io);
          return;
        }

        const flagged = await messageService.createMessage(
          userId,
          content,
          "FLAGGED",
          mod.toxicityScore
        );
        const updatedUser = await userService.applyFlaggedStrike(userId, mod);
        const primary =
          formatViolationCategories(mod.flaggedCategories) || "Policy violation";

        socket.emit("message_blocked", {
          warning: `This message violates community guideline: ${POLICY_REFERENCE}. ${primary ? `(${primary} detected)` : ""}`.trim(),
          strikeCount: updatedUser.strikeCount,
          categories: mod.flaggedCategories,
          categoryLabel: primary || "Toxic content",
          policyReference: POLICY_REFERENCE,
          toxicityScore: mod.toxicityScore,
          action: "Blocked",
          escalated: updatedUser.status === "ESCALATED",
          autoReportTriggered: updatedUser.status === "ESCALATED",
          userStatus: userService.deriveStatusLabel(updatedUser),
        });

        io.to("community_chat").emit("moderation_notice", {
          id: flagged.id,
          createdAt: flagged.createdAt,
          user: {
            id: updatedUser.id,
            displayName: updatedUser.displayName,
            avatarColor: updatedUser.avatarColor,
          },
          categoryLabel: primary || "Toxic content",
          policyReference: POLICY_REFERENCE,
        });

        const flaggedPayload = {
          id: flagged.id,
          content: flagged.content,
          createdAt: flagged.createdAt,
          toxicityScore: mod.toxicityScore,
          categoryLabel: primary || "Toxic content",
          user: {
            id: updatedUser.id,
            displayName: updatedUser.displayName,
            avatarColor: updatedUser.avatarColor,
          },
        };
        io.to("moderators").emit("mod_flagged_append", flaggedPayload);
        io.to("moderators").emit("notify", {
          kind: "message_blocked",
          displayName: updatedUser.displayName,
          strikeCount: updatedUser.strikeCount,
          messageId: flagged.id,
        });

        if (updatedUser.status === "ESCALATED") {
          io.to("moderators").emit("notify", {
            kind: "user_escalated",
            userId: updatedUser.id,
            displayName: updatedUser.displayName,
            sessionId: updatedUser.sessionId,
          });
        }

        await pushModeratorDashboard(io);
      } catch (e) {
        socket.emit("error", { message: e.message || "Failed to send" });
      }
    });

    socket.on("report_message", async (payload) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("error", { message: "Join chat before reporting" });
        return;
      }

      const messageId = String(payload?.messageId ?? "");
      const reason = String(payload?.reason ?? "");

      try {
        const msg = await messageService.getMessageById(messageId);
        if (!msg || msg.status !== "APPROVED") {
          socket.emit("error", { message: "Only visible messages can be reported" });
          return;
        }

        const { report, duplicate } = await reportService.createReport(
          messageId,
          userId,
          reason
        );

        if (!duplicate) {
          await userService.bumpRiskScore(msg.userId, 2);
        }

        socket.emit("report_ack", { ok: true, duplicate });

        io.to("moderators").emit("notify", {
          kind: "user_reported",
          messageId,
          reason: report.reason,
          reporterId: userId,
          authorId: msg.userId,
        });

        await pushModeratorDashboard(io);
      } catch (e) {
        socket.emit("error", { message: e.message || "Report failed" });
      }
    });
  });
}
