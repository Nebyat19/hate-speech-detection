import { useEffect, useMemo, useState } from "react";
import { useAppSocket, useToasts } from "../hooks/AppProviders.jsx";
import { fetchLiveUsers, fetchStats } from "../services/api.js";

function StatCard({ label, value, tone = "default" }) {
  const tones = {
    default: "from-zinc-800/80 to-zinc-900/80 ring-sg-border",
    accent: "from-emerald-900/40 to-teal-950/50 ring-emerald-500/25",
    warn: "from-amber-900/30 to-amber-950/40 ring-amber-500/25",
    danger: "from-rose-900/35 to-rose-950/45 ring-rose-500/25",
  };
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-4 ring-1 ${tones[tone] || tones.default}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function statusPill(status) {
  const s = String(status);
  if (s === "Escalated")
    return "bg-rose-500/20 text-rose-200 ring-rose-500/35";
  if (s === "High Risk")
    return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
  if (s === "Warning") return "bg-yellow-500/10 text-yellow-100 ring-yellow-500/25";
  return "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25";
}

function riskTierPill(tier) {
  const t = String(tier);
  if (t === "High risk") return "text-rose-200 ring-rose-500/40";
  if (t === "Medium risk") return "text-amber-200 ring-amber-500/35";
  return "text-emerald-200 ring-emerald-500/30";
}

export function DashboardPage() {
  const socket = useAppSocket();
  const { pushToast } = useToasts();
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [flaggedQueue, setFlaggedQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (b.compositeRisk ?? 0) - (a.compositeRisk ?? 0)),
    [rows]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, u] = await Promise.all([fetchStats(), fetchLiveUsers()]);
        if (cancelled) return;
        setStats(s);
        setRows(u.users ?? []);
      } catch (e) {
        if (!cancelled) pushToast({ kind: "danger", message: String(e.message) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  useEffect(() => {
    if (!socket) return undefined;

    const onStats = (s) => setStats(s);
    const onUsers = (list) => setRows(list);
    const onInitial = ({ liveFeed: feed, flaggedQueue: fq }) => {
      if (Array.isArray(feed)) setLiveFeed(feed);
      if (Array.isArray(fq)) setFlaggedQueue(fq);
    };
    const onFeedAppend = (msg) => {
      setLiveFeed((prev) => [...prev.slice(-60), msg]);
    };
    const onFlaggedAppend = (item) => {
      setFlaggedQueue((prev) => [item, ...prev].slice(0, 40));
    };
    const onNotify = (n) => {
      if (n.kind === "message_blocked") {
        pushToast({
          kind: "warn",
          message: `Blocked / strike: ${n.displayName} (strikes ${n.strikeCount})`,
        });
      } else if (n.kind === "user_escalated") {
        pushToast({
          kind: "danger",
          message: `Escalated user: ${n.displayName} — review inbox.`,
        });
      } else if (n.kind === "user_reported") {
        pushToast({
          kind: "info",
          message: `New community report (${n.reason}) on a message.`,
        });
      }
    };

    socket.on("stats_update", onStats);
    socket.on("users_table_update", onUsers);
    socket.on("mod_initial", onInitial);
    socket.on("mod_feed_append", onFeedAppend);
    socket.on("mod_flagged_append", onFlaggedAppend);
    socket.on("notify", onNotify);
    socket.emit("mod:subscribe", {});

    return () => {
      socket.off("stats_update", onStats);
      socket.off("users_table_update", onUsers);
      socket.off("mod_initial", onInitial);
      socket.off("mod_feed_append", onFeedAppend);
      socket.off("mod_flagged_append", onFlaggedAppend);
      socket.off("notify", onNotify);
    };
  }, [socket, pushToast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Safety Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live message feed, flagged queue, and risk-ranked members — streaming over WebSocket.
        </p>
      </div>

      {loading || !stats ? (
        <p className="text-sm text-zinc-500">Loading metrics…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Active users (24h)" value={stats.activeUsers} tone="accent" />
          <StatCard label="Total messages" value={stats.totalMessages} />
          <StatCard label="Flagged" value={stats.flaggedMessages} tone="warn" />
          <StatCard label="Reports" value={stats.reportedMessages} />
          <StatCard label="Escalated" value={stats.escalatedUsers} tone="danger" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/35 shadow-lg shadow-black/25">
          <div className="border-b border-sg-border px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Live message feed</h2>
            <p className="text-xs text-zinc-500">Recently approved messages (most recent at bottom)</p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-sg-border/50">
            {liveFeed.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-500">Waiting for traffic…</p>
            ) : (
              liveFeed.map((m) => (
                <div key={m.id} className="px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-zinc-200">{m.user?.displayName}</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      tox {m.toxicityScore != null ? Number(m.toxicityScore).toFixed(2) : "—"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-zinc-400">{m.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/35 shadow-lg shadow-black/25">
          <div className="border-b border-sg-border px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Flagged messages queue</h2>
            <p className="text-xs text-zinc-500">Blocked attempts — newest first</p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-sg-border/50">
            {flaggedQueue.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-500">Queue is clear.</p>
            ) : (
              flaggedQueue.map((f) => (
                <div key={f.id} className="px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-rose-200/90">{f.user?.displayName}</span>
                    <span className="text-[10px] text-rose-300/80">{f.categoryLabel}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-zinc-500">
                    score {f.toxicityScore != null ? Number(f.toxicityScore).toFixed(2) : "—"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-zinc-400">{f.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/35 shadow-lg shadow-black/25">
        <div className="border-b border-sg-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Risk ranking</h2>
          <p className="text-xs text-zinc-500">
            Sorted by composite risk (reports + toxic messages + strikes + model risk)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sg-border text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Strikes</th>
                <th className="px-4 py-3 font-medium">Reports</th>
                <th className="px-4 py-3 font-medium">Toxic msgs</th>
                <th className="px-4 py-3 font-medium">Model risk</th>
                <th className="px-4 py-3 font-medium">Composite</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    Waiting for participants…
                  </td>
                </tr>
              ) : (
                sortedRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-sg-border/60 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">{r.displayName}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{r.strikeCount}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{r.reports}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{r.toxicMessages ?? 0}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{r.riskLevel}</td>
                    <td className="px-4 py-3 font-mono text-amber-200/90">{r.compositeRisk}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${riskTierPill(r.riskTier)}`}
                      >
                        {r.riskTier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusPill(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
