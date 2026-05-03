import { Link } from "react-router-dom";
import { MacTerminalDemo } from "../components/MacTerminalDemo.jsx";
import { APP_NAME } from "../config/branding.js";

export function LandingPage() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(62, 232, 168, 0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(31, 168, 118, 0.08), transparent)",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1 text-center lg:max-w-xl lg:pt-2 lg:text-left">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-400/90">{APP_NAME}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Community chat with live moderation
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400 lg:mx-0">
              Local ONNX scoring, strikes, safety dashboard, and an OpenAI-shaped{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-emerald-200/90">
                POST /v1/moderations
              </code>{" "}
              API — all from this app.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/chat"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-sg-bg shadow-lg shadow-emerald-500/25 transition hover:brightness-110"
              >
                Open community chat
              </Link>
              <Link
                to="/dashboard"
                className="rounded-xl border border-sg-border bg-sg-surface/60 px-6 py-3 text-sm font-medium text-zinc-200 ring-1 ring-white/5 transition hover:bg-sg-surface"
              >
                Safety dashboard
              </Link>
              <Link
                to="/docs"
                className="rounded-xl px-6 py-3 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                API reference →
              </Link>
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-[min(100%,26rem)] xl:w-[28rem]">
            <MacTerminalDemo />
            <p className="mt-4 text-center text-xs text-zinc-500 lg:text-right">
              <Link
                to="/docs"
                className="text-emerald-400/85 underline-offset-2 hover:text-emerald-300 hover:underline"
              >
                Full API reference and OpenAPI spec
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-4 px-4 sm:grid-cols-3">
        {[
          {
            title: "Live screening",
            body: "Messages analyzed before they appear; clear approve / block feedback.",
          },
          {
            title: "Moderator view",
            body: "Feed, flagged queue, and risk-ranked users in one place.",
          },
          {
            title: "Integrate anywhere",
            body: "Call the moderation API from your stack — same shape as OpenAI moderations.",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-sg-border bg-sg-surface/40 p-5 text-left shadow-lg shadow-black/20"
          >
            <h2 className="font-semibold text-white">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
