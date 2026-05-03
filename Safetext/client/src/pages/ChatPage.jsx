import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppSocket, useToasts } from "../hooks/AppProviders.jsx";
import { getStoredSessionId, setStoredSessionId } from "../services/sessionStorage.js";
import { ChatMessageBubble } from "../components/ChatMessageBubble.jsx";
import { ModerationNoticeBubble } from "../components/ModerationNoticeBubble.jsx";

function StrikeMeter({ strike, max }) {
  const m = Math.max(1, Number(max) || 3);
  const s = Math.min(strike, m);
  return (
    <span className="inline-flex gap-0.5 text-base leading-none" aria-label={`${s} of ${m} strikes`}>
      {Array.from({ length: m }, (_, i) => (
        <span key={i} className={i < s ? "text-amber-400" : "text-zinc-600"}>
          {i < s ? "⚠" : "⚪"}
        </span>
      ))}
    </span>
  );
}

const initialModUi = { phase: "idle" };

export function ChatPage() {
  const socket = useAppSocket();
  const { pushToast } = useToasts();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [modUi, setModUi] = useState(initialModUi);
  const [connected, setConnected] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!socket) return undefined;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return undefined;

    const onReady = ({ user }) => {
      setMe(user);
      setStoredSessionId(user.sessionId);
    };
    const onHistory = ({ messages: hist }) => setMessages(hist);
    const onNew = (msg) => setMessages((prev) => [...prev, msg]);
    const onModerationNotice = (notice) =>
      setMessages((prev) => [...prev, { ...notice, messageKind: "moderation_notice" }]);
    const onOnline = (users) => setOnlineUsers(Array.isArray(users) ? users : []);
    const onErr = (payload) => {
      pushToast({
        kind: "danger",
        message: payload.message || "Something went wrong",
      });
    };
    const onReportAck = () => {
      pushToast({ kind: "success", message: "Thanks — moderators were notified." });
    };

    socket.on("session_ready", onReady);
    socket.on("message_history", onHistory);
    socket.on("new_message", onNew);
    socket.on("moderation_notice", onModerationNotice);
    socket.on("online_users", onOnline);
    socket.on("error", onErr);
    socket.on("report_ack", onReportAck);

    const sid = getStoredSessionId();
    socket.emit("chat:join", { sessionId: sid });

    return () => {
      socket.off("session_ready", onReady);
      socket.off("message_history", onHistory);
      socket.off("new_message", onNew);
      socket.off("moderation_notice", onModerationNotice);
      socket.off("online_users", onOnline);
      socket.off("error", onErr);
      socket.off("report_ack", onReportAck);
    };
  }, [socket, pushToast]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !socket || modUi.phase === "analyzing") return;

    const start = Date.now();
    const minMs = 200 + Math.random() * 300;
    setDraft("");
    setModUi({ phase: "analyzing", startedAt: start, minMs });

    const finish = (fn) => {
      const wait = Math.max(0, minMs - (Date.now() - start));
      setTimeout(fn, wait);
    };

    const onApprove = (p) => {
      socket.off("message_approved", onApprove);
      socket.off("message_blocked", onBlock);
      socket.off("error", onErr);
      finish(() => {
        setModUi({ phase: "approved", ...p });
        setTimeout(() => setModUi(initialModUi), 2200);
      });
    };

    const onBlock = (p) => {
      socket.off("message_approved", onApprove);
      socket.off("message_blocked", onBlock);
      socket.off("error", onErr);
      finish(() => {
        setModUi({ phase: "blocked", ...p });
        if (p.strikeCount != null) {
          setMe((m) =>
            m
              ? {
                  ...m,
                  strikeCount: p.strikeCount,
                  status: p.userStatus ?? m.status,
                }
              : m
          );
        } else if (p.userStatus) {
          setMe((m) => (m ? { ...m, status: p.userStatus } : m));
        }
        setTimeout(() => setModUi(initialModUi), 3800);
      });
    };

    const onErr = () => {
      socket.off("message_approved", onApprove);
      socket.off("message_blocked", onBlock);
      socket.off("error", onErr);
      finish(() => {
        setModUi(initialModUi);
      });
    };

    socket.on("message_approved", onApprove);
    socket.on("message_blocked", onBlock);
    socket.on("error", onErr);

    socket.emit("send_message", { content: text });
  }, [draft, socket, modUi.phase]);

  const onReport = useCallback(
    (messageId, reason) => {
      socket?.emit("report_message", { messageId, reason });
    },
    [socket]
  );

  const maxStrikes = me?.maxStrikes ?? 3;
  const escalated = me?.status === "Escalated";

  return (
    <div
      className="
        flex max-h-[calc(100dvh-6.25rem)] min-h-0 flex-1 flex-col gap-4 overflow-hidden
        sm:max-h-[calc(100dvh-6.75rem)]
        lg:grid lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)] lg:min-h-[360px]
        lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,280px)] lg:gap-8
      "
    >
      <aside className="flex max-h-[28dvh] min-h-0 shrink-0 flex-col gap-4 overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/25 p-5 shadow-lg shadow-black/15 lg:max-h-none lg:min-h-0 lg:overflow-y-auto">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Online</h2>
        <ul className="sg-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 text-sm">
          {onlineUsers.length === 0 ? (
            <li className="text-xs text-zinc-600">No participants yet.</li>
          ) : (
            onlineUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
                <span
                  className="h-7 w-7 shrink-0 rounded-full text-center text-[10px] font-bold leading-7 text-sg-bg"
                  style={{ backgroundColor: u.avatarColor }}
                >
                  {u.displayName?.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-zinc-200">{u.displayName}</span>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/40 shadow-xl shadow-black/20 lg:h-full lg:min-h-0">
        <div className="flex shrink-0 items-center justify-between border-b border-sg-border px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Community chat</h1>
            <p className="text-xs text-zinc-500">Messages are screened before delivery. Be kind.</p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              connected
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                : "bg-zinc-800 text-zinc-500 ring-zinc-700"
            }`}
          >
            {connected ? "Connected" : "Offline"}
          </div>
        </div>

        {escalated ? (
          <div className="mx-5 mt-4 shrink-0 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            <p className="font-semibold">🔴 Account escalated</p>
            <p className="mt-1 text-xs text-rose-200/90">Auto-report triggered — a moderator will review.</p>
          </div>
        ) : null}

        <div
          ref={listRef}
          className="sg-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden px-5 py-6"
        >
          {messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No messages yet. Say hello — respectful conversation encouraged.
            </p>
          ) : (
            messages.map((m) =>
              m.messageKind === "moderation_notice" ? (
                <ModerationNoticeBubble
                  key={m.id}
                  notice={m}
                  currentUserId={me?.id ?? null}
                />
              ) : (
                <ChatMessageBubble
                  key={m.id}
                  message={m}
                  currentUserId={me?.id ?? null}
                  onReport={onReport}
                  connected={connected}
                />
              )
            )
          )}
        </div>

        <div className="shrink-0 border-t border-sg-border p-4 sm:p-5">
          {me ? (
            <div className="mb-4 rounded-xl border border-sg-border/80 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold text-zinc-400">User card</p>
              <p className="mt-1 text-sm font-semibold text-white">{me.displayName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StrikeMeter strike={me.strikeCount} max={maxStrikes} />
                <span className="text-[11px] text-zinc-500">
                  ({me.strikeCount}/{maxStrikes} strikes)
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Status:{" "}
                <span className="font-medium text-zinc-200">{me.status}</span>
                <span className="mx-2 text-zinc-600">·</span>
                Risk:{" "}
                <span className="font-medium text-emerald-200/90">{me.riskTier ?? "—"}</span>
              </p>
            </div>
          ) : null}

          {modUi.phase === "analyzing" ? (
            <div className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 animate-pulse">
              <p className="text-sm font-medium text-emerald-100">✨ Analyzing message…</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="sg-progress-bar h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              </div>
            </div>
          ) : null}

          {modUi.phase === "approved" ? (
            <div className="mb-3 rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
              ✔ Message approved
              {modUi.toxicityScore != null ? (
                <span className="ml-2 text-xs text-emerald-200/80">
                  (toxicity {Number(modUi.toxicityScore).toFixed(2)})
                </span>
              ) : null}
            </div>
          ) : null}

          {modUi.phase === "blocked" ? (
            <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-100">
              🔴{" "}
              {modUi.categoryLabel && modUi.categoryLabel !== "Account restriction"
                ? `Blocked due to toxic content (${modUi.categoryLabel} detected)`
                : modUi.warning || "Blocked"}
              {modUi.policyReference ? (
                <p className="mt-2 text-xs text-rose-200/85">
                  Guideline: {modUi.policyReference}
                </p>
              ) : null}
              {modUi.autoReportTriggered ? (
                <p className="mt-1 text-xs font-medium text-rose-200">Auto-report triggered</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-3">
            <label className="sr-only" htmlFor="msg">
              Message
            </label>
            <input
              id="msg"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              className="min-h-11 flex-1 rounded-xl border border-sg-border bg-sg-bg px-4 text-sm text-white outline-none ring-emerald-500/0 transition placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2"
              disabled={!connected || modUi.phase === "analyzing"}
            />
            <button
              type="button"
              onClick={send}
              disabled={!connected || !draft.trim() || modUi.phase === "analyzing"}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-sm font-semibold text-sg-bg shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </section>

      <aside className="flex max-h-[32dvh] min-h-0 shrink-0 flex-col gap-5 overflow-y-auto lg:max-h-none lg:min-h-0">
        <div className="rounded-2xl border border-sg-border bg-sg-surface/30 p-5 text-sm text-zinc-400">
          <h2 className="mb-2 font-semibold text-white">Moderation</h2>
          <p className="text-xs leading-relaxed text-zinc-500">
            Each message is scored before it posts. Hover the Safe / Warning pill on any message for
            toxicity, category, and action.
          </p>
          {me ? (
            <dl className="mt-3 space-y-2 border-t border-sg-border/60 pt-3 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Risk score (composite)</dt>
                <dd className="font-mono text-zinc-200">{me.compositeRisk ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Reports on you</dt>
                <dd className="font-mono text-zinc-200">{me.reports ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Toxic messages (history)</dt>
                <dd className="font-mono text-zinc-200">{me.toxicMessages ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Strikes</dt>
                <dd className="font-mono text-zinc-200">
                  {me.strikeCount}/{maxStrikes}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
        <div className="rounded-2xl border border-sg-border bg-sg-surface/25 p-5 text-xs leading-relaxed text-zinc-500">
          <h2 className="mb-2 text-sm font-semibold text-white">Safety Dashboard</h2>
          <p>
            Open the{" "}
            <Link to="/dashboard" className="font-semibold text-emerald-200/90 underline decoration-emerald-500/40 hover:text-emerald-100">
              Safety dashboard
            </Link>{" "}
            for live feeds, the flagged queue, and risk-ranked members.
          </p>
        </div>
      </aside>
    </div>
  );
}
