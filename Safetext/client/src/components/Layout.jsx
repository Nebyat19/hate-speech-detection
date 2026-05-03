import { NavLink, Outlet } from "react-router-dom";
import { APP_INITIAL, APP_NAME, APP_TAGLINE } from "../config/branding.js";
import { ToastStack } from "./ToastStack.jsx";

const linkClass = ({ isActive }) =>
  [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-white/10 text-white"
      : "text-zinc-400 hover:bg-white/5 hover:text-white",
  ].join(" ");

const footerLink =
  "text-sm text-zinc-500 transition-colors hover:text-emerald-400/90";

const footerNavClass = ({ isActive }) =>
  [
    "text-sm transition-colors",
    isActive ? "font-medium text-emerald-400/95" : "text-zinc-500 hover:text-emerald-400/90",
  ].join(" ");

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-sg-border/80 bg-sg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2" end>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-bold text-sg-bg shadow-lg shadow-emerald-500/20"
              aria-hidden
            >
              {APP_INITIAL}
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">{APP_NAME}</p>
              <p className="text-xs text-zinc-500">{APP_TAGLINE}</p>
            </div>
          </NavLink>
          <nav
            className="flex flex-wrap items-center gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-sg-border/60"
            aria-label="Main"
          >
            <NavLink to="/" className={linkClass} end>
              Home
            </NavLink>
            <NavLink to="/chat" className={linkClass}>
              Community chat
            </NavLink>
            <NavLink to="/dashboard" className={linkClass}>
              Safety dashboard
            </NavLink>
            <NavLink to="/docs" className={linkClass}>
              API docs
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
      <footer className="mt-auto border-t border-sg-border/80 bg-sg-surface/20">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-sg-bg shadow-md shadow-emerald-500/15"
                  aria-hidden
                >
                  {APP_INITIAL}
                </span>
                <p className="text-sm font-semibold text-white">{APP_NAME}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{APP_TAGLINE}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:gap-16">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  Product
                </p>
                <ul className="mt-3 flex flex-col gap-2" role="list">
                  <li>
                    <NavLink to="/" className={footerNavClass} end>
                      Home
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/chat" className={footerNavClass}>
                      Community chat
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/dashboard" className={footerNavClass}>
                      Safety dashboard
                    </NavLink>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  Developers
                </p>
                <ul className="mt-3 flex flex-col gap-2" role="list">
                  <li>
                    <NavLink to="/docs" className={footerNavClass}>
                      API docs
                    </NavLink>
                  </li>
                  <li>
                    <a href="/openapi.yaml" className={footerLink} target="_blank" rel="noreferrer">
                      OpenAPI spec
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-sg-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} {APP_NAME}. Automated screening assists moderators; review critical
              decisions in context.
            </p>
          </div>
        </div>
      </footer>
      <ToastStack />
    </div>
  );
}
