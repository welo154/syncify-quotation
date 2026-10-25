"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ensureInstallationSection } from "@/lib/document";
import { clientUnitPrice, computeTotals, DISCOUNT_WARN_PERCENT } from "@/lib/totals";
import { formatMoney, finite, uid } from "@/lib/money";
import type { CatalogProduct, DiscountType, DocumentPayload, LineItem, Section } from "@/lib/types";

type EventRow = {
  id: string;
  action: string;
  summary: string | null;
  at: string;
  user: { name: string };
};

type Meta = {
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  kind: "quote" | "invoice";
  documentId: string;
  initial: DocumentPayload & Record<string, unknown>;
  meta: Meta;
  events: EventRow[];
  numberField: string;
  dateField: string;
  secondaryDateField: string;
  numberLabel: string;
  dateLabel: string;
  secondaryDateLabel: string;
  totalLabel: string;
  previewKind: "quotation" | "invoice";
  statusOptions: { value: string; label: string }[];
  onSave: (payload: DocumentPayload & Record<string, unknown>) => Promise<{ error?: string; ok?: boolean }>;
  onPrintRecord: () => Promise<{ error?: string; ok?: boolean }>;
  extraActions?: React.ReactNode;
  products?: CatalogProduct[];
};

function blankItem(): LineItem {
  return {
    id: uid(),
    name: "",
    category: "",
    qty: 1,
    price: 0,
    note: "",
    productId: null,
    code: "",
    unit: "",
  };
}

function applyCatalogProduct(item: LineItem, product: CatalogProduct): LineItem {
  return {
    ...item,
    productId: product.id,
    code: product.code,
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: finite(product.unitPrice),
    note: product.description || item.note,
  };
}

export function DocumentEditor({
  kind,
  documentId,
  initial,
  meta,
  events,
  numberField,
  dateField,
  secondaryDateField,
  numberLabel,
  dateLabel,
  secondaryDateLabel,
  totalLabel,
  previewKind,
  statusOptions,
  onSave,
  onPrintRecord,
  extraActions,
  products = [],
}: Props) {
  const [state, setState] = useState(() =>
    normalizeState(initial as DocumentPayload & Record<string, unknown>)
  );
  const [saveStatus, setSaveStatus] = useState("All changes saved");
  const [toast, setToast] = useState("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "print" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [catalogQuery, setCatalogQuery] = useState<Record<string, string>>({});

  const totals = useMemo(() => computeTotals(state), [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function patch(p: Partial<DocumentPayload & Record<string, unknown>>) {
    setState((prev) => {
      const next = { ...prev, ...p };
      if (
        "discountType" in p ||
        "discountValue" in p
      ) {
        const draft = { ...prev, ...p } as DocumentPayload;
        const t = computeTotals(draft);
        if (t.discountExceedsLimit) {
          next.discountAcknowledged = false;
        } else {
          next.discountAcknowledged = true;
        }
      }
      return next;
    });
    setSaveStatus("Unsaved changes");
  }

  function updateSection(sectionId: string, updater: (s: Section) => Section) {
    patch({
      sections: ensureInstallationSection(
        state.sections.map((s) => (s.id === sectionId ? updater(s) : s))
      ),
    });
  }

  async function runSave(acknowledged = state.discountAcknowledged) {
    const payload = {
      ...state,
      discountAcknowledged: acknowledged,
      sections: ensureInstallationSection(state.sections),
    };
    setSaveStatus("Saving…");
    const result = await onSave(payload);
    if (result.error) {
      setToast(result.error);
      setSaveStatus("Save failed");
      return false;
    }
    setState(payload);
    setSaveStatus("Saved");
    setToast("Saved successfully");
    return true;
  }

  function requestSave() {
    if (totals.discountExceedsLimit && !state.discountAcknowledged) {
      setPendingAction("save");
      setShowDiscountModal(true);
      return;
    }
    startTransition(() => {
      void runSave();
    });
  }

  function requestPrint() {
    if (!state.clientName.trim()) {
      setToast("Add a client name before printing.");
      return;
    }
    const hasItems = state.sections.some(
      (s) => !s.locked && s.items.some((i) => i.name.trim())
    );
    if (!hasItems && state.installationPercent <= 0) {
      setToast("Add at least one item before printing.");
      return;
    }
    if (totals.discountExceedsLimit && !state.discountAcknowledged) {
      setPendingAction("print");
      setShowDiscountModal(true);
      return;
    }
    startTransition(async () => {
      const saved = await runSave(true);
      if (!saved) return;
      const printed = await onPrintRecord();
      if (printed.error) {
        setToast(printed.error);
        return;
      }
      window.print();
    });
  }

  async function confirmDiscount() {
    setShowDiscountModal(false);
    const action = pendingAction;
    setPendingAction(null);
    startTransition(async () => {
      const saved = await runSave(true);
      if (!saved) return;
      if (action === "print") {
        const printed = await onPrintRecord();
        if (printed.error) {
          setToast(printed.error);
          return;
        }
        window.print();
      }
    });
  }

  const productSections = state.sections.filter((s) => !s.locked);
  const currencyProducts = products.filter((p) => p.currency === state.currency);
  const catalogPool = currencyProducts.length > 0 ? currencyProducts : products;

  function catalogChoices(item: LineItem): CatalogProduct[] {
    const q = (catalogQuery[item.id] || "").trim().toLowerCase();
    const matches = catalogPool.filter((p) => {
      if (p.id === item.productId) return true;
      if (!q) return true;
      return `${p.code} ${p.name} ${p.category}`.toLowerCase().includes(q);
    });
    if (item.productId && !matches.some((p) => p.id === item.productId)) {
      const selected = products.find((p) => p.id === item.productId);
      if (selected) return [selected, ...matches];
    }
    return matches;
  }

  return (
    <>
      <div className="editor-chrome no-print">
        <span className="save-status">{isPending ? "Working…" : saveStatus}</span>
        {extraActions}
        <button type="button" className="button subtle" onClick={requestSave}>
          Save
        </button>
        <button type="button" className="button primary" onClick={requestPrint}>
          Download PDF / Print
        </button>
      </div>

      <main className="workspace">
        <aside className="editor no-print">
          <div className="editor-topline">
            <div>
              <span className="eyebrow">
                {kind === "quote" ? "CREATE & CUSTOMIZE" : "INVOICE STUDIO"}
              </span>
              <h1>{kind === "quote" ? "Build a better quote." : "Bill your client."}</h1>
            </div>
            <span className="step-pill">{documentId.slice(0, 6).toUpperCase()}</span>
          </div>
          <p className="intro">
            Created by {meta.createdBy} · Last edited by {meta.updatedBy}
          </p>

          <section className="panel">
            <div className="panel-heading">
              <span className="icon">01</span>
              <div>
                <h2>{kind === "quote" ? "Quote details" : "Invoice details"}</h2>
                <p>Who, what, and when</p>
              </div>
            </div>
            <div className="grid two">
              <label>
                {numberLabel}
                <input
                  value={String(state[numberField] ?? "")}
                  onChange={(e) =>
                    patch({ [numberField]: e.target.value } as Partial<
                      DocumentPayload & Record<string, unknown>
                    >)
                  }
                />
              </label>
              <label>
                {dateLabel}
                <input
                  type="date"
                  value={String(state[dateField] ?? "")}
                  onChange={(e) =>
                    patch({ [dateField]: e.target.value } as Partial<
                      DocumentPayload & Record<string, unknown>
                    >)
                  }
                />
              </label>
              <label>
                {secondaryDateLabel}
                <input
                  type="date"
                  value={String(state[secondaryDateField] ?? "")}
                  onChange={(e) =>
                    patch({ [secondaryDateField]: e.target.value } as Partial<
                      DocumentPayload & Record<string, unknown>
                    >)
                  }
                />
              </label>
              <label>
                Currency
                <select
                  value={state.currency}
                  onChange={(e) => patch({ currency: e.target.value })}
                >
                  <option value="EGP">EGP (ج.م)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </label>
            </div>
            <div className="grid two">
              <label>
                Client name
                <input
                  value={state.clientName}
                  onChange={(e) => patch({ clientName: e.target.value })}
                  placeholder="Mr. Walaa"
                />
              </label>
              <label>
                Client phone / email
                <input
                  value={state.clientContact}
                  onChange={(e) => patch({ clientContact: e.target.value })}
                />
              </label>
            </div>
            <label>
              Project name
              <input
                value={state.projectName}
                onChange={(e) => patch({ projectName: e.target.value })}
              />
            </label>
            <label>
              Project location
              <input
                value={state.projectLocation}
                onChange={(e) => patch({ projectLocation: e.target.value })}
              />
            </label>
              <label>
                Status
                <select
                  value={String(state.status ?? "draft")}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <span className="icon">02</span>
              <div>
                <h2>Company identity</h2>
                <p>Branding and contact details</p>
              </div>
            </div>
            <div className="grid two">
              <label>
                Company name
                <input
                  value={state.companyName}
                  onChange={(e) => patch({ companyName: e.target.value })}
                />
              </label>
              <label>
                Phone
                <input
                  value={state.companyPhone}
                  onChange={(e) => patch({ companyPhone: e.target.value })}
                />
              </label>
            </div>
            <label>
              Email / website
              <input
                value={state.companyWeb}
                onChange={(e) => patch({ companyWeb: e.target.value })}
              />
            </label>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <span className="icon">03</span>
              <div>
                <h2>Products & services</h2>
                <p>Group line items by room. Printed names include the room.</p>
              </div>
            </div>
            <div id="sectionsEditor">
              {productSections.map((s) => (
                <div className="section-card" key={s.id}>
                  <div className="section-head">
                    <input
                      type="text"
                      aria-label="Section name"
                      value={s.name}
                      onChange={(e) =>
                        updateSection(s.id, (sec) => ({
                          ...sec,
                          name: e.target.value,
                        }))
                      }
                    />
                    <label className="optional-label">
                      <input
                        type="checkbox"
                        checked={s.optional}
                        onChange={(e) =>
                          updateSection(s.id, (sec) => ({
                            ...sec,
                            optional: e.target.checked,
                          }))
                        }
                      />
                      Optional
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      title="Remove section"
                      onClick={() =>
                        patch({
                          sections: ensureInstallationSection(
                            state.sections.filter((x) => x.id !== s.id)
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                  {s.items.map((i) => {
                    const choices = catalogChoices(i);
                    const groups = new Map<string, CatalogProduct[]>();
                    for (const product of choices) {
                      const key = product.category.trim() || "Other";
                      const list = groups.get(key) ?? [];
                      list.push(product);
                      groups.set(key, list);
                    }
                    const selected = products.find((p) => p.id === i.productId);
                    return (
                    <div className="item-card" key={i.id}>
                      <div className="catalog-pick">
                        <label>
                          Search catalog
                          <input
                            value={catalogQuery[i.id] ?? ""}
                            placeholder="Code, name, or category"
                            onChange={(e) =>
                              setCatalogQuery((prev) => ({
                                ...prev,
                                [i.id]: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Catalog product
                          <select
                            value={i.productId ?? ""}
                            onChange={(e) => {
                              const productId = e.target.value;
                              updateSection(s.id, (sec) => ({
                                ...sec,
                                items: sec.items.map((it) => {
                                  if (it.id !== i.id) return it;
                                  if (!productId) {
                                    return { ...it, productId: null };
                                  }
                                  const product = products.find((p) => p.id === productId);
                                  return product ? applyCatalogProduct(it, product) : it;
                                }),
                              }));
                            }}
                          >
                            <option value="">Custom item (enter details below)</option>
                            {[...groups.entries()].map(([category, list]) => (
                              <optgroup key={category} label={category}>
                                {list.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.code} — {product.name} —{" "}
                                    {formatMoney(product.unitPrice, product.currency)}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <span className="catalog-hint">
                            {products.length === 0
                              ? "No active products in the catalog. Add them on the Products page."
                              : selected
                                ? `Base price from catalog: ${formatMoney(selected.unitPrice, selected.currency)}${selected.unit ? ` / ${selected.unit}` : ""}`
                                : currencyProducts.length === 0
                                  ? "No products in this currency. Showing the full catalog."
                                  : "Choosing a product fills the name and base price from the database."}
                          </span>
                        </label>
                      </div>
                      <div className="item-row">
                        <label>
                          Product / service
                          <input
                            value={i.name}
                            placeholder="e.g. Zigbee 2-gang switch"
                            onChange={(e) =>
                              updateSection(s.id, (sec) => ({
                                ...sec,
                                items: sec.items.map((it) =>
                                  it.id === i.id ? { ...it, name: e.target.value } : it
                                ),
                              }))
                            }
                          />
                        </label>
                        <label>
                          Qty
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={i.qty}
                            onChange={(e) =>
                              updateSection(s.id, (sec) => ({
                                ...sec,
                                items: sec.items.map((it) =>
                                  it.id === i.id
                                    ? { ...it, qty: finite(e.target.value) }
                                    : it
                                ),
                              }))
                            }
                          />
                        </label>
                        <label>
                          Base price
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={i.price}
                            onChange={(e) =>
                              updateSection(s.id, (sec) => ({
                                ...sec,
                                items: sec.items.map((it) =>
                                  it.id === i.id
                                    ? { ...it, price: finite(e.target.value) }
                                    : it
                                ),
                              }))
                            }
                          />
                        </label>
                        <span className="line-total">
                          {formatMoney(
                            i.qty * clientUnitPrice(i.price, state.markupPercent),
                            state.currency
                          )}
                        </span>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() =>
                            updateSection(s.id, (sec) => ({
                              ...sec,
                              items: sec.items.filter((it) => it.id !== i.id),
                            }))
                          }
                        >
                          ×
                        </button>
                      </div>
                      <div className="item-more">
                        <input
                          aria-label="Category"
                          value={i.category}
                          placeholder="Category"
                          onChange={(e) =>
                            updateSection(s.id, (sec) => ({
                              ...sec,
                              items: sec.items.map((it) =>
                                it.id === i.id
                                  ? { ...it, category: e.target.value }
                                  : it
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label="Item note"
                          value={i.note}
                          placeholder="Optional specification / note"
                          onChange={(e) =>
                            updateSection(s.id, (sec) => ({
                              ...sec,
                              items: sec.items.map((it) =>
                                it.id === i.id ? { ...it, note: e.target.value } : it
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    );
                  })}
                  <button
                    type="button"
                    className="button outline add-item"
                    onClick={() =>
                      updateSection(s.id, (sec) => ({
                        ...sec,
                        items: [...sec.items, blankItem()],
                      }))
                    }
                  >
                    + Add item
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="button outline full"
              onClick={() =>
                patch({
                  sections: ensureInstallationSection([
                    ...state.sections.filter((s) => !s.locked),
                    {
                      id: uid(),
                      name: "New room / section",
                      optional: false,
                      items: [blankItem()],
                    },
                    ...state.sections.filter((s) => s.locked),
                  ]),
                })
              }
            >
              + Add room / section
            </button>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <span className="icon">04</span>
              <div>
                <h2>Installation</h2>
                <p>Enter the percentage here. The client document shows the amount only.</p>
              </div>
            </div>
            <div className="grid two">
              <label>
                Installation %
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={state.installationPercent}
                  onChange={(e) =>
                    patch({ installationPercent: finite(e.target.value) })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state.installationFree}
                  onChange={(e) => patch({ installationFree: e.target.checked })}
                />
                Make installation complimentary
              </label>
            </div>
            <p className="helper">
              Calculated amount:{" "}
              <strong>
                {formatMoney(totals.installationOriginal, state.currency)}
              </strong>
              {state.installationFree
                ? " (shown struck through; client pays 0)"
                : ""}
            </p>
          </section>

          <section className="panel staff-only">
            <div className="panel-heading">
              <span className="icon">05</span>
              <div>
                <h2>Staff pricing controls</h2>
                <p>Not shown on the printed client document</p>
              </div>
            </div>
            <label>
              Internal markup %
              <input
                type="number"
                min={0}
                step="0.01"
                value={state.markupPercent}
                onChange={(e) => patch({ markupPercent: finite(e.target.value) })}
              />
            </label>
            <p className="helper">
              Inflates all unit prices for the client document (e.g. 10 for
              commission). Client sees marked-up prices only.
            </p>
            <div className="grid two">
              <label>
                Discount type
                <select
                  value={state.discountType}
                  onChange={(e) =>
                    patch({
                      discountType: e.target.value as DiscountType,
                    })
                  }
                >
                  <option value="none">No discount</option>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label>
                Discount value
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={state.discountValue}
                  onChange={(e) =>
                    patch({ discountValue: finite(e.target.value) })
                  }
                />
              </label>
            </div>
            {totals.discountExceedsLimit && (
              <div className={`discount-warn ${state.discountAcknowledged ? "acked" : ""}`}>
                {state.discountAcknowledged
                  ? `Discount above ${DISCOUNT_WARN_PERCENT}% acknowledged.`
                  : `Warning: discount exceeds ${DISCOUNT_WARN_PERCENT}%. Confirm before save or print.`}
              </div>
            )}
            <div id="editorTotals" className="editor-totals">
              <div className="total-line">
                <span>Products (client)</span>
                <strong>{formatMoney(totals.productsClient, state.currency)}</strong>
              </div>
              <div className="total-line">
                <span>Installation</span>
                <strong>
                  {formatMoney(totals.installationAmount, state.currency)}
                </strong>
              </div>
              <div className="total-line">
                <span>Discount</span>
                <strong>− {formatMoney(totals.discount, state.currency)}</strong>
              </div>
              {totals.optionalClient > 0 && (
                <div className="total-line">
                  <span>Optional items</span>
                  <strong>+ {formatMoney(totals.optionalClient, state.currency)}</strong>
                </div>
              )}
              <div className="total-line final">
                <span>{totalLabel}</span>
                <strong>{formatMoney(totals.grand, state.currency)}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <span className="icon">06</span>
              <div>
                <h2>Terms & notes</h2>
                <p>Write only what applies</p>
              </div>
            </div>
            <label>
              Scope / client note
              <textarea
                rows={3}
                value={state.clientNote}
                onChange={(e) => patch({ clientNote: e.target.value })}
              />
            </label>
            <label>
              Payment terms
              <textarea
                rows={2}
                value={state.paymentTerms}
                onChange={(e) => patch({ paymentTerms: e.target.value })}
              />
            </label>
            <label>
              Warranty & exclusions
              <textarea
                rows={2}
                value={state.warrantyTerms}
                onChange={(e) => patch({ warrantyTerms: e.target.value })}
              />
            </label>
            <label>
              Additional notes
              <textarea
                rows={2}
                value={state.extraTerms}
                onChange={(e) => patch({ extraTerms: e.target.value })}
              />
            </label>
          </section>

          <section className="panel utility-panel">
            <h2>Activity</h2>
            <p>Who created and edited this document</p>
            <div className="activity-list">
              {events.length === 0 ? (
                <p className="helper">No events yet.</p>
              ) : (
                events.map((ev) => (
                  <div className="activity-row" key={ev.id}>
                    <strong>{ev.user.name}</strong>
                    <span>{ev.summary || ev.action}</span>
                    <small>{new Date(ev.at).toLocaleString()}</small>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="preview-side">
          <div className="preview-top no-print">
            <div>
              <span className="eyebrow">LIVE PREVIEW</span>
              <strong>
                Client-facing {previewKind === "invoice" ? "invoice" : "quotation"}
              </strong>
            </div>
            <span className="paper-label">A4 layout</span>
          </div>
          <DocumentPreview
            doc={state}
            kind={previewKind}
            number={String(state[numberField] ?? "")}
            dateLabel={dateLabel}
            dateValue={String(state[dateField] ?? "")}
            secondaryLabel={secondaryDateLabel}
            secondaryValue={String(state[secondaryDateField] ?? "")}
            totalLabel={totalLabel}
          />
          <div className="preview-hint no-print">
            Use “Download PDF / Print”, then choose “Save as PDF” in your browser.
          </div>
        </section>
      </main>

      {showDiscountModal && (
        <div className="modal-backdrop no-print" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>Discount exceeds {DISCOUNT_WARN_PERCENT}%</h2>
            <p>
              This {kind === "quote" ? "quotation" : "invoice"} has a discount above{" "}
              {DISCOUNT_WARN_PERCENT}%
              {state.discountType === "percent"
                ? ` (${state.discountValue}%)`
                : ` (about ${totals.effectiveDiscountPercent.toFixed(1)}%)`}
              . Confirm you are aware before continuing.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button subtle"
                onClick={() => {
                  setShowDiscountModal(false);
                  setPendingAction(null);
                }}
              >
                Cancel
              </button>
              <button type="button" className="button primary" onClick={confirmDiscount}>
                I am aware — continue
              </button>
            </div>
          </div>
        </div>
      )}

      {toast ? (
        <div id="toast" className="show" role="status">
          {toast}
        </div>
      ) : (
        <div id="toast" role="status" />
      )}
    </>
  );
}

function normalizeState(
  initial: DocumentPayload & Record<string, unknown>
): DocumentPayload & Record<string, unknown> {
  return {
    ...initial,
    sections: ensureInstallationSection(initial.sections || []),
  };
}
