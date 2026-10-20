import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="login-page">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/syncify-logo.png" alt="SYNCIFY" />
        <h1>Staff login</h1>
        <p className="sub">Sign in to manage quotations and invoices.</p>
        {params.error ? (
          <div className="login-error">Invalid email or password.</div>
        ) : null}
        <form action={loginAction}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="button primary full" style={{ marginTop: 8 }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
