import { useMemo, useState } from "react";
import { getApiOrigin } from "../config/apiOrigin.js";

const tabs = [
  { id: "curl", label: "cURL" },
  { id: "py", label: "Python" },
  { id: "js", label: "JavaScript" },
];

export function MacTerminalDemo() {
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

  const snippet =
    tab === "curl" ? samples.curl : tab === "py" ? samples.py : samples.js;

  const responseSample = `{
  "id": "modr-sg-…",
  "model": "Xenova/toxic-bert",
  "results": [{ "flagged": false, "categories": { "toxic": false }, "category_scores": { "toxic": 0.001 } }]
}`;

  return (
    <div className="w-full max-w-2xl lg:mx-0 lg:max-w-none">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 lg:text-left">
        Try the moderation API
      </p>
      <div className="overflow-hidden rounded-xl border border-sg-border bg-[#161b26] shadow-2xl shadow-black/50 ring-1 ring-white/[0.06]">
        <div className="flex h-9 select-none items-center gap-2 border-b border-white/[0.06] bg-gradient-to-b from-[#3d4454] to-[#343a48] px-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-sm ring-1 ring-black/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-sm ring-1 ring-black/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-sm ring-1 ring-black/20" />
          </div>
          <span className="pointer-events-none flex-1 text-center text-[11px] font-medium text-zinc-400 tabular-nums">
            Terminal — zsh — moderations
          </span>
          <span className="w-14 shrink-0" aria-hidden />
        </div>

        <div
          className="flex gap-0 border-b border-white/[0.06] bg-[#12161e] px-2 pt-1"
          role="tablist"
          aria-label="Example language"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={[
                "rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-[#0d1118] text-emerald-300/95"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-[#0d1118] px-4 py-3">
          <pre className="sg-scroll max-h-[min(40vh,18rem)] overflow-auto text-left font-mono text-[11px] leading-relaxed sm:text-xs">
            <code className="whitespace-pre-wrap text-zinc-300">
              {tab === "curl" ? (
                <>
                  <span className="text-emerald-400/90">$ </span>
                  {samples.curl}
                </>
              ) : (
                snippet
              )}
            </code>
          </pre>
          <p className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Example response
          </p>
          <pre className="mt-1.5 font-mono text-[11px] leading-relaxed text-emerald-200/70 sm:text-xs">
            <code>{responseSample}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
