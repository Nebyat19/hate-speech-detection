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

function formatValue(value) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "0.00";
}

function buildLinePath(points, width, height, padding) {
  if (!points.length) return "";
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = points.length === 1 ? 0 : usableWidth / (points.length - 1);

  return points
    .map((point, index) => {
      const x = padding + index * step;
      const y = padding + (1 - point.value / max) * usableHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function LineGraphCard({ title, description, points, accent = "emerald" }) {
  const width = 360;
  const height = 170;
  const padding = 16;
  const max = Math.max(...points.map((p) => p.value), 1);
  const path = buildLinePath(points, width, height, padding);
  const tint = accent === "rose" ? "stroke-rose-300 fill-rose-400/15" : "stroke-emerald-300 fill-emerald-400/15";
  const glow = accent === "rose" ? "drop-shadow-[0_0_14px_rgba(251,113,133,0.22)]" : "drop-shadow-[0_0_14px_rgba(52,211,153,0.20)]";

  return (
    <div className="overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/35 shadow-lg shadow-black/25">
      <div className="border-b border-sg-border px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className="p-4">
        {points.length === 0 ? (
          <p className="py-10 text-center text-xs text-zinc-500">Waiting for enough data to chart…</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible">
              <defs>
                <linearGradient id={`graph-${accent}-fill`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={accent === "rose" ? "#fda4af" : "#6ee7b7"} stopOpacity="0.34" />
                  <stop offset="100%" stopColor={accent === "rose" ? "#fda4af" : "#6ee7b7"} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((tick) => {
                const y = padding + (1 - tick) * (height - padding * 2);
                return (
                  <line
                    key={tick}
                    x1={padding}
                    x2={width - padding}
                    y1={y}
                    y2={y}
                    className="stroke-white/8"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                );
              })}
              <path
                d={`${path} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
                fill={`url(#graph-${accent}-fill)`}
              />
              <path d={path} className={`fill-none stroke-[2.5] ${tint} ${glow}`} strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => {
                const step = points.length === 1 ? 0 : (width - padding * 2) / (points.length - 1);
                const x = padding + index * step;
                const y = padding + (1 - point.value / max) * (height - padding * 2);
                return (
                  <g key={`${point.label}-${index}`}>
                    <circle cx={x} cy={y} r="4" className="fill-sg-surface stroke-current text-white/75" strokeWidth="2" />
                  </g>
                );
              })}
            </svg>
            <div className="flex min-w-0 flex-col gap-2 text-xs text-zinc-500 lg:pb-2">
              <div className="flex items-center justify-between gap-4">
                <span>Peak</span>
                <span className="font-mono text-zinc-300">{formatValue(max)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Latest</span>
                <span className="font-mono text-zinc-300">{formatValue(points.at(-1)?.value ?? 0)}</span>
              </div>
              <div className="space-y-1 pt-2">
                {points.slice(-5).map((point) => (
                  <div key={point.label} className="flex items-center justify-between gap-4">
                    <span className="truncate">{point.label}</span>
                    <span className="font-mono text-zinc-300">{formatValue(point.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarGraphCard({ title, description, rows, accent = "amber" }) {
  const width = 360;
  const height = 180;
  const padding = 16;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const barHeight = rows.length ? (height - padding * 2 - (rows.length - 1) * 12) / rows.length : 0;
  const fillClass = accent === "rose" ? "bg-rose-400" : accent === "emerald" ? "bg-emerald-400" : "bg-amber-300";

  return (
    <div className="overflow-hidden rounded-2xl border border-sg-border bg-sg-surface/35 shadow-lg shadow-black/25">
      <div className="border-b border-sg-border px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-zinc-500">No ranked users to chart yet.</p>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible">
            {rows.map((row, index) => {
              const y = padding + index * (barHeight + 12);
              const barWidth = (row.value / max) * (width - 120);
              return (
                <g key={row.label}>
                  <text x={padding} y={y + barHeight / 2 - 4} className="fill-zinc-300 text-[11px] font-medium">
                    {row.label}
                  </text>
                  <text x={width - padding} y={y + barHeight / 2 - 4} textAnchor="end" className="fill-zinc-400 text-[11px] font-mono">
                    {formatValue(row.value)}
                  </text>
                  <rect
                    x={padding}
                    y={y + barHeight / 2 + 2}
                    width={width - padding * 2}
                    height="8"
                    rx="999"
                    className="fill-white/6"
                  />
                  <rect
                    x={padding}
                    y={y + barHeight / 2 + 2}
                    width={Math.max(barWidth, 4)}
                    height="8"
                    rx="999"
                    className={fillClass}
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
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

  const recentToxicitySeries = useMemo(
    () =>
      liveFeed
        .slice(-12)
        .map((message, index) => ({
          label: message.user?.displayName ? message.user.displayName : `M${index + 1}`,
          value: Number(message.toxicityScore ?? 0),
        })),
    [liveFeed]
  );

  const riskSeries = useMemo(
    () =>
      sortedRows.slice(0, 6).map((row) => ({
        label: row.displayName,
        value: Number(row.compositeRisk ?? 0),
      })),
    [sortedRows]
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
        <LineGraphCard
          title="Recent toxicity trend"
          description="Last 12 approved messages plotted by model score."
          points={recentToxicitySeries}
          accent="emerald"
        />
        <BarGraphCard
          title="Top risk users"
          description="Composite risk for the highest-ranked members."
          rows={riskSeries}
          accent="amber"
        />
      </div>

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
