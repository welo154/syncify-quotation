import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/types";

export function AppHeader({
  user,
  title = "STUDIO",
  actions,
}: {
  user: SessionUser;
  title?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/syncify-logo.png" alt="SYNCIFY Smart Home Integrations" />
        </Link>
        <small>{title}</small>
      </div>
      <nav className="app-nav">
        <Link href="/" className="nav-link">
          Quotes
        </Link>
        <Link href="/invoices" className="nav-link">
          Invoices
        </Link>
        {user.role === "admin" && (
          <Link href="/admin/users" className="nav-link">
            Users
          </Link>
        )}
      </nav>
      <div className="header-actions">
        {actions}
        <span className="user-chip">
          {user.name}
          <em>{user.role}</em>
        </span>
        <form action={logoutAction}>
          <button type="submit" className="button subtle">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
