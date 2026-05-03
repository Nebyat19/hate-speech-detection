import { useToasts } from "../hooks/AppProviders.jsx";

const styles = {
  info: "border-sg-border bg-sg-surface/95",
  success: "border-emerald-500/40 bg-emerald-950/40",
  warn: "border-amber-500/40 bg-amber-950/35",
  danger: "border-rose-500/50 bg-rose-950/40",
};

export function ToastStack() {
  const { toasts } = useToasts();
  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-50 flex max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/40 backdrop-blur-md ${styles[t.kind] || styles.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
