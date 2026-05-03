import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const REASONS = [
  { value: "hate speech", label: "Hate speech" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "threat", label: "Threat" },
  { value: "other", label: "Other" },
];

const MENU_W = 208;

export function ReportButton({ disabled, messageId, onReport, isSelf }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }

    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 10;
      const approxH = 280;
      let top = r.bottom + margin;
      let left = r.right - MENU_W;
      if (left < margin) left = margin;
      if (left + MENU_W > window.innerWidth - margin) {
        left = window.innerWidth - MENU_W - margin;
      }
      if (top + approxH > window.innerHeight - margin) {
        top = Math.max(margin, r.top - approxH - margin);
      }
      setCoords({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  if (isSelf) return null;

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300 disabled:opacity-40"
      >
        Report
      </button>
      {open && coords
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[80] cursor-default"
                aria-label="Close report menu"
                onClick={() => setOpen(false)}
              />
              <div
                role="menu"
                className="fixed z-[90] w-[208px] overflow-hidden rounded-xl border border-sg-border bg-sg-surface py-1 shadow-2xl shadow-black/50 ring-1 ring-white/5"
                style={{ top: coords.top, left: coords.left }}
              >
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="menuitem"
                    className="block w-full px-3.5 py-2.5 text-left text-xs text-zinc-300 transition hover:bg-white/[0.06] active:bg-white/10"
                    onClick={() => {
                      onReport(messageId, r.value);
                      setOpen(false);
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
