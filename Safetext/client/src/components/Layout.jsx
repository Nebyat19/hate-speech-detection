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
      <ToastStack />
    </div>
  );
}
