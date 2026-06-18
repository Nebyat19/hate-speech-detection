import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiOrigin } from "../config/apiOrigin.js";
import { APP_NAME } from "../config/branding.js";

const nav = [
  { href: "#introduction", label: "Introduction" },
  { href: "#authentication", label: "Authentication" },
  { group: "Endpoints" },
  { href: "#health", label: "Health check" },
  { href: "#moderations", label: "Create moderation" },
  { href: "#legacy", label: "Legacy: moderate" },
  { group: "Spec" },
  { href: "/openapi.yaml", label: "openapi.yaml", external: true },
];

function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-sg-border bg-[#0d1118] p-4 text-left font-mono text-xs leading-relaxed text-zinc-200">
      <code>{children}</code>
    </pre>
  );
}

export function DocsPage() {
  const [tab, setTab] = useState("curl");
  const api = useMemo(() => getApiOrigin(), []);

  const samples = useMemo(() => {
    const curl = `curl -sS -X POST "${api}/v1/moderations" \\
  -H "Content-Type: application/json" \\
  -d '{"input":"hello there"}'`;
    const py = `import requests

r = requests.post(
    "${api}/v1/moderations",
    json={"input": "hello there"},
)
r.raise_for_status()
print(r.json())`;
    const js = `const r = await fetch("${api}/v1/moderations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: "hello there" }),
});
console.log(await r.json());`;
    return { curl, py, js };
  }, [api]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <aside className="shrink-0 lg:sticky lg:top-24 lg:w-56">
        <p className="text-sm font-semibold text-white">{APP_NAME} API</p>
        <p className="mt-0.5 text-xs text-zinc-500">Moderation · local ONNX</p>
        <nav className="mt-6 flex flex-col gap-1 text-sm" aria-label="On this page">
          {nav.map((item, i) =>
            "group" in item ? (
              <p key={i} className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 first:mt-0">
                {item.group}
              </p>
            ) : item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-2 py-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-2 py-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            )
          )}
        </nav>
        <Link
          to="/chat"
          className="mt-6 block rounded-lg px-2 py-1.5 text-xs text-emerald-400/90 hover:text-emerald-300"
        >
          ← Community chat
        </Link>
      </aside>

      <article className="min-w-0 flex-1 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Moderation API</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Classify text using an endpoint and response shape{" "}
          <strong className="text-zinc-300">compatible with OpenAI’s moderation API</strong>. Point your
          HTTP client at <code className="rounded bg-white/10 px-1 font-mono text-emerald-200/80">/v1/moderations</code>, send
          the same JSON body (<code className="font-mono text-zinc-300">input</code>), and read{" "}
          <code className="font-mono text-zinc-300">results[].flagged</code> and{" "}
          <code className="font-mono text-zinc-300">category_scores</code>.
        </p>

        <p className="mt-6 font-mono text-sm text-emerald-400/90">
          Base URL: <span className="text-emerald-300">{api}</span>
        </p>

        <h2 id="introduction" className="mt-12 scroll-mt-28 text-xl font-semibold text-white">
          Introduction
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {APP_NAME} runs a <strong className="text-zinc-300">local</strong> classifier (
          <code className="font-mono text-zinc-300">
            hoan/multilingual-toxic-xlm-roberta-dynamic-quantized
          </code>{" "}
          by default). Scores are
          probabilistic; combine with human review for production moderation.
        </p>

        <h2 id="authentication" className="mt-10 scroll-mt-28 text-xl font-semibold text-white">
          Authentication
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          If the operator sets <code className="font-mono text-zinc-300">PUBLIC_API_KEYS</code>, send your
          key in <code className="font-mono text-zinc-300">X-API-Key</code> or{" "}
          <code className="font-mono text-zinc-300">Authorization: Bearer …</code>. If no keys are
          configured, requests are accepted without auth (demo only).
        </p>

        <h2 id="health" className="mt-10 scroll-mt-28 text-xl font-semibold text-white">
          Health check
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Use <code className="font-mono text-zinc-300">GET /v1/health</code> to confirm the service is up, see the
          running version, and verify the configured local and Amharic model names before sending traffic.
        </p>
        <div className="mt-3">
          <CodeBlock>{`{
  "ok": true,
  "service": "Safetext-public-v1",
  "version": "1.0.0",
  "uptimeSeconds": 42.1,
  "model": "hoan/multilingual-toxic-xlm-roberta-dynamic-quantized",
  "amharicModel": "uhhlt/amharic-hate-speech"
}`}</CodeBlock>
        </div>

        <h2 id="moderations" className="mt-10 scroll-mt-28 text-xl font-semibold text-white">
          Create moderation
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Scores one or more strings, same as OpenAI’s <code className="font-mono text-zinc-300">POST /v1/moderations</code>{" "}
          contract.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded bg-emerald-600 px-2 py-1 font-mono text-xs font-semibold text-white">
            POST
          </span>
          <span className="font-mono text-sm text-zinc-200">/v1/moderations</span>
        </div>

        <h3 className="mt-8 text-sm font-semibold text-zinc-200">Request body</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-sg-border">
          <table className="w-full min-w-lg text-left text-sm">
            <thead>
              <tr className="border-b border-sg-border bg-sg-surface/80 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-sg-border/70">
                <td className="px-3 py-2 font-mono text-emerald-200/80">input</td>
                <td className="px-3 py-2">string or string[]</td>
                <td className="px-3 py-2">yes</td>
                <td className="px-3 py-2 text-zinc-400">Text to classify (array = one result per string).</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-emerald-200/80">model</td>
                <td className="px-3 py-2">string</td>
                <td className="px-3 py-2">no</td>
                <td className="px-3 py-2 text-zinc-400">Echoed in the response.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 text-sm font-semibold text-zinc-200">Response</h3>
        <p className="mt-2 text-sm text-zinc-400">OpenAI-style object:</p>
        <div className="mt-3">
          <CodeBlock>{`{
  "id": "modr-sg-…",
  "model": "hoan/multilingual-toxic-xlm-roberta-dynamic-quantized",
  "results": [
    {
      "flagged": false,
      "categories": { "toxic": false },
      "category_scores": { "toxic": 0.001 }
    }
  ]
}`}</CodeBlock>
        </div>

        <div className="mt-6 max-w-2xl border-l-2 border-emerald-500/50 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-400">
          We expose a primary <code className="font-mono text-zinc-300">toxic</code> dimension. This is not a
          full multiclass replica of every OpenAI category; use <code className="font-mono text-zinc-300">flagged</code> and{" "}
          <code className="font-mono text-zinc-300">category_scores.toxic</code> as the main signals when porting from OpenAI.
        </div>

        <h3 className="mt-8 text-sm font-semibold text-zinc-200">Examples</h3>
        <div className="mt-3 flex gap-0 border-b border-sg-border">
          {[
            { id: "curl", label: "cURL" },
            { id: "py", label: "Python" },
            { id: "js", label: "JavaScript" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "-mb-px border-emerald-500 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === "curl" ? <CodeBlock>{samples.curl}</CodeBlock> : null}
          {tab === "py" ? <CodeBlock>{samples.py}</CodeBlock> : null}
          {tab === "js" ? <CodeBlock>{samples.js}</CodeBlock> : null}
        </div>

        <h2 id="legacy" className="mt-14 scroll-mt-28 text-xl font-semibold text-white">
          Legacy: POST /v1/moderate
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {APP_NAME}-specific body: <code className="font-mono text-zinc-300">{"{ \"text\": \"…\" }"}</code> with a flat{" "}
          <code className="font-mono text-zinc-300">safe</code> /{" "}
          <code className="font-mono text-zinc-300">toxicityScore</code> response. Prefer{" "}
          <code className="font-mono text-zinc-300">/v1/moderations</code> for OpenAI-style integrations.
        </p>
      </article>
    </div>
  );
}
