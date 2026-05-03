/**
 * Shown when a user’s message is blocked by moderation (visible to everyone).
 * Original text is never shown.
 */
export function ModerationNoticeBubble({ notice, currentUserId }) {
  const time = new Date(notice.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isSelf = notice.user.id === currentUserId;
  const label = notice.categoryLabel || "policy violation";

  return (
    <div
      className="flex justify-center py-1"
      role="status"
      aria-live="polite"
    >
      <div
        className="max-w-[min(100%,34rem)] rounded-lg border border-rose-500/45 bg-rose-950/35 px-3 py-2 text-center shadow-md shadow-rose-950/20 ring-1 ring-rose-500/15"
      >
        <div className="mb-1 flex items-center justify-center gap-1.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-sg-bg ring-2 ring-rose-500/40"
            style={{ backgroundColor: notice.user.avatarColor }}
            aria-hidden
          >
            {notice.user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm leading-none" aria-hidden>
            ⛔
          </span>
        </div>
        <p className="text-xs font-medium leading-snug text-rose-100">
          {isSelf ? "You" : <strong className="text-rose-50">{notice.user.displayName}</strong>}{" "}
          {isSelf ? "tried to send a message that " : "sent a message that "}
          <span className="font-semibold text-rose-200/95">was blocked and removed</span>
          <span className="text-rose-200/80"> — {label} detected.</span>
        </p>
        <p className="mt-1 text-[10px] leading-snug text-rose-300/85">
          The exact words were not shown to others.{" "}
          <span className="text-rose-200/70">{notice.policyReference}</span>
        </p>
        <p className="mt-1 text-[9px] uppercase tracking-wider text-rose-400/70">{time}</p>
      </div>
    </div>
  );
}
