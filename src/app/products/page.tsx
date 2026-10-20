import { AppHeader } from "@/components/AppHeader";
import { ProductCatalog } from "@/components/ProductCatalog";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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
              Add new items or edit existing codes, names, and prices.
            </p>
          </div>
        </div>
        <ProductCatalog
          products={products.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            category: p.category,
            description: p.description,
            unit: p.unit,
            unitPrice: p.unitPrice,
            currency: p.currency,
            active: p.active,
          }))}
        />
      </div>
    </>
  );
}
