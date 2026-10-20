"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createProductAction,
  setProductActiveAction,
  updateProductAction,
} from "@/app/actions/products";
import { formatMoney } from "@/lib/money";

export type ProductRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;
  currency: string;
  active: boolean;
};

const emptyForm = {
  code: "",
  name: "",
  category: "",
  description: "",
  unit: "piece",
  unitPrice: "0",
  currency: "EGP",
  active: true,
};

export function ProductCatalog({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  function startEdit(p: ProductRow) {
    setError("");
    setMessage("");
    setEditingId(p.id);
    setEditForm({
      code: p.code,
      name: p.name,
      category: p.category,
      description: p.description,
      unit: p.unit,
      unitPrice: String(p.unitPrice),
      currency: p.currency,
      active: p.active,
    });
  }

  function toFormData(
    values: typeof emptyForm,
    extra?: Record<string, string>
  ): FormData {
    const fd = new FormData();
    fd.set("code", values.code);
    fd.set("name", values.name);
    fd.set("category", values.category);
    fd.set("description", values.description);
    fd.set("unit", values.unit);
    fd.set("unitPrice", values.unitPrice);
    fd.set("currency", values.currency);
    fd.set("active", values.active ? "true" : "false");
    if (extra) {
      for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    }
    return fd;
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await createProductAction(toFormData(createForm));
        setCreateForm(emptyForm);
        setMessage("Product added.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add product.");
      }
    });
  }

  function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await updateProductAction(toFormData(editForm, { id: editingId }));
        setEditingId(null);
        setMessage("Product updated.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update product.");
      }
    });
  }

  function toggleActive(p: ProductRow) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await setProductActiveAction(p.id, !p.active);
        setMessage(p.active ? "Product deactivated." : "Product activated.");
        if (editingId === p.id) setEditingId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update status.");
      }
    });
  }

  return (
    <>
      <section className="panel">
        <h2>Add product</h2>
        <p className="helper">
          Same fields as your previous catalog: code, name, category, unit price.
        </p>
        <form onSubmit={onCreate} className="admin-form">
          <div className="admin-grid">
            <label>
              Code
              <input
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="SYN-001-ZB"
                required
              />
            </label>
            <label>
              Name
              <input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Switch 1 Gang (Zigbee)"
                required
              />
            </label>
            <label>
              Category
              <input
                value={createForm.category}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Touch Switches"
              />
            </label>
            <label>
              Unit
              <input
                value={createForm.unit}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, unit: e.target.value }))
                }
              />
            </label>
            <label>
              Unit price
              <input
                type="number"
                min={0}
                step="0.01"
                value={createForm.unitPrice}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, unitPrice: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Currency
              <select
                value={createForm.currency}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, currency: e.target.value }))
                }
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>
          <label>
            Description
            <input
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional"
            />
          </label>
          <button type="submit" className="button primary" disabled={pending}>
            {pending ? "Saving…" : "Add product"}
          </button>
        </form>
      </section>

      <div className="list-header" style={{ marginTop: 8 }}>
        <label style={{ margin: 0, maxWidth: 360, width: "100%" }}>
          Search catalog
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code, name, or category"
          />
        </label>
        <span className="muted">
          {filtered.length} of {products.length} products
        </span>
      </div>

      {error ? <div className="login-error">{error}</div> : null}
      {message ? (
        <p className="helper" style={{ color: "var(--teal)", fontWeight: 700 }}>
          {message}
        </p>
      ) : null}

      <table className="list-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Unit price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                No products match this search.
              </td>
            </tr>
          ) : (
            filtered.map((p) =>
              editingId === p.id ? (
                <tr key={p.id}>
                  <td colSpan={6}>
                    <form onSubmit={onSaveEdit} className="admin-form" style={{ margin: 0 }}>
                      <div className="admin-grid">
                        <label>
                          Code
                          <input
                            value={editForm.code}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, code: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label>
                          Name
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, name: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label>
                          Category
                          <input
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                category: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Unit
                          <input
                            value={editForm.unit}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, unit: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Unit price
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editForm.unitPrice}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                unitPrice: e.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                        <label>
                          Currency
                          <select
                            value={editForm.currency}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                currency: e.target.value,
                              }))
                            }
                          >
                            <option value="EGP">EGP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Description
                        <input
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="checkbox-label" style={{ marginTop: 0 }}>
                        <input
                          type="checkbox"
                          checked={editForm.active}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              active: e.target.checked,
                            }))
                          }
                        />
                        Active in catalog
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="submit"
                          className="button primary"
                          disabled={pending}
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="button subtle"
                          onClick={() => setEditingId(null)}
                          disabled={pending}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>
                    <strong>{p.code}</strong>
                    <div className="muted">{p.unit}</div>
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
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="button subtle"
                        onClick={() => startEdit(p)}
                        disabled={pending}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button subtle"
                        onClick={() => toggleActive(p)}
                        disabled={pending}
                      >
                        {p.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </>
  );
}
