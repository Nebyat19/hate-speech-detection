import { useState } from "react";
import { ReportButton } from "./ReportButton.jsx";

const badgeStyles = {
  safe: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/35",
  warning: "bg-amber-500/15 text-amber-100 ring-amber-500/30",
  blocked: "bg-rose-500/15 text-rose-100 ring-rose-500/35",
};

const badgeLabel = {
  safe: "Safe",
  warning: "Warning",
  blocked: "Blocked",
};

export function ChatMessageBubble({ message, currentUserId, onReport, connected }) {
  const mine = message.user.id === currentUserId;
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const badge = message.moderationBadge ?? "safe";
  const tox =
    message.toxicityScore != null && Number.isFinite(Number(message.toxicityScore))
      ? Number(message.toxicityScore)
      : null;
  const category = message.categoryLabel ?? (badge === "safe" ? "None" : "—");
  const action = message.moderationAction ?? "Delivered";

  const badgeAria = `Moderation: toxicity ${tox != null ? tox.toFixed(2) : "—"}, category ${category}, action ${action}`;

  const [tipOpen, setTipOpen] = useState(false);

  return (
    <div className={`flex gap-4 pb-1 ${mine ? "flex-row-reverse" : ""}`}>
      <div
        className="mt-1 h-10 w-10 shrink-0 rounded-full text-center text-xs font-bold leading-10 text-sg-bg shadow-inner"
        style={{ backgroundColor: message.user.avatarColor }}
        aria-hidden
      >
        {message.user.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div
        className={`max-w-[min(100%,32rem)] ${mine ? "items-end" : "items-start"} flex flex-col gap-2`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-zinc-200">{message.user.displayName}</span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-600">{time}</span>
          <div
            className="relative"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            onFocus={() => setTipOpen(true)}
            onBlur={() => setTipOpen(false)}
          >
            <span
              className={`inline-flex cursor-default rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeStyles[badge] || badgeStyles.safe}`}
              tabIndex={0}
              aria-label={badgeAria}
            >
              {badgeLabel[badge] || "Safe"}
            </span>
            {tipOpen ? (
              <div
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-sg-border bg-zinc-900/98 px-2.5 py-2 text-[10px] leading-relaxed text-zinc-200 shadow-xl"
                role="tooltip"
              >
                <p>Toxicity score: {tox != null ? tox.toFixed(2) : "—"}</p>
                <p className="text-zinc-400">Category: {category}</p>
                <p className="text-zinc-400">Action: {action}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div
          className={`break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            mine
              ? "rounded-tr-sm bg-emerald-600/25 text-emerald-50 ring-1 ring-emerald-500/30"
              : "rounded-tl-sm bg-sg-surface text-zinc-100 ring-1 ring-sg-border"
          }`}
        >
          {message.content}
        </div>
        <div className={`mt-0.5 flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
          <ReportButton
            messageId={message.id}
            disabled={!connected}
            isSelf={mine}
            onReport={onReport}
          />
        </div>
      </div>
    </div>
  );
}
