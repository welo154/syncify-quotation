import { AppHeader } from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/money";

export default async function ProductsPage() {
  const user = await requireUser();
  const products = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { code: "asc" }],
  });

  return (
    <>
      <AppHeader user={user} title="PRODUCT CATALOG" />
      <div className="list-page">
        <div className="list-header">
          <div>
            <span className="eyebrow">CATALOG</span>
            <h1>Products</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {products.length} products migrated from your previous Supabase catalog.
            </p>
          </div>
        </div>
        <table className="list-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.code}</strong>
                  </td>
                  <td>
                    {p.name}
                    {p.description ? (
                      <div className="muted">{p.description}</div>
                    ) : null}
                  </td>
                  <td>{p.category || "—"}</td>
                  <td>{formatMoney(p.unitPrice, p.currency)}</td>
                  <td>
                    <span className={`status-pill ${p.active ? "paid" : ""}`}>
                      {p.active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
