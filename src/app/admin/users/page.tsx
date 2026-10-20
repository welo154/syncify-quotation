import { AppHeader } from "@/components/AppHeader";
import {
  createUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  setUserRoleAction,
} from "@/app/actions/users";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function AdminUsersPage() {
  const user = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <AppHeader user={user} title="ADMIN" />
      <div className="list-page">
        <div className="list-header">
          <div>
            <span className="eyebrow">ACCESS</span>
            <h1>Users</h1>
          </div>
        </div>

        <section className="panel">
          <h2>Add user</h2>
          <p className="helper">Only admins can create accounts.</p>
          <form action={createUserAction} className="admin-form">
            <div className="admin-grid">
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" minLength={6} required />
              </label>
              <label>
                Role
                <select name="role" defaultValue="staff">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <button type="submit" className="button primary">
              Create user
            </button>
          </form>
        </section>

        <table className="list-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <form
                    action={async () => {
                      "use server";
                      await setUserRoleAction(
                        u.id,
                        u.role === "admin" ? "staff" : "admin"
                      );
                    }}
                  >
                    <button type="submit" className="button subtle">
                      {u.role}
                    </button>
                  </form>
                </td>
                <td>
                  <span className={`status-pill ${u.active ? "paid" : ""}`}>
                    {u.active ? "active" : "disabled"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <form
                      action={async () => {
                        "use server";
                        await setUserActiveAction(u.id, !u.active);
                      }}
                    >
                      <button type="submit" className="button subtle">
                        {u.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={resetUserPasswordAction} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        name="password"
                        type="password"
                        placeholder="New password"
                        minLength={6}
                        required
                        style={{ margin: 0, width: 140 }}
                      />
                      <button type="submit" className="button subtle">
                        Reset
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
