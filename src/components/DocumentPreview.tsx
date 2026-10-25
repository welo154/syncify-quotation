"use client";

import { displayItemName, esc, formatMoney } from "@/lib/money";
import { clientUnitPrice, computeTotals, sumItemsClient } from "@/lib/totals";
import type { DocumentPayload } from "@/lib/types";

function formatDate(d: string) {
  if (!d) return "—";
  const x = new Date(`${d}T12:00:00`);
  if (Number.isNaN(x.getTime())) return esc(d);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(x);
}

function meta(title: string, val: string, cls = "") {
  return (
    <div>
      <div className="meta-label">{title}</div>
      <div className={`meta-value ${cls}`}>{val || "—"}</div>
    </div>
  );
}

export function DocumentPreview({
  doc,
  kind,
  number,
  dateLabel,
  dateValue,
  secondaryLabel,
  secondaryValue,
  totalLabel,
}: {
  doc: DocumentPayload;
  kind: "quotation" | "invoice";
  number: string;
  dateLabel: string;
  dateValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  totalLabel: string;
}) {
  const t = computeTotals(doc);
  const currency = doc.currency;
  const productSections = doc.sections.filter((s) => !s.locked);
  const visible = productSections.filter((s) =>
    s.items.some((i) => i.name.trim())
  );

  return (
    <article id="docPreview" className="paper">
      <div className="quote-header">
        <div className="quote-brand">
          {doc.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="quote-logo" src={doc.logo} alt={`${doc.companyName} logo`} />
          ) : (
            <div>
              <div className="quote-wordmark">{doc.companyName || "SYNCIFY"}</div>
              <p>SMART HOME INTEGRATIONS</p>
            </div>
          )}
        </div>
        <div className="quote-contact">
          {doc.companyPhone}
          {doc.companyPhone && doc.companyWeb ? <br /> : null}
          {doc.companyWeb}
        </div>
      </div>

      <div className="quote-kicker">
        {kind === "invoice" ? "TAX INVOICE" : "PROJECT PROPOSAL"}
      </div>
      <h1 className="quote-title">{kind === "invoice" ? "Invoice" : "Quotation"}</h1>
      <p className="quote-subtitle">
        {doc.projectName ||
          (kind === "invoice"
            ? "Payment request for your smart home project."
            : "Your smart space, thoughtfully planned.")}
      </p>

      <div className="quote-meta">
        {meta("Prepared for", doc.clientName)}
        {meta(kind === "invoice" ? "Invoice" : "Quotation", number)}
        {meta(dateLabel, formatDate(dateValue))}
        {meta("Project location", doc.projectLocation, "small")}
        {meta("Contact", doc.clientContact, "small")}
        {meta(secondaryLabel, formatDate(secondaryValue), "small")}
      </div>

      {visible.length === 0 && t.installationOriginal === 0 ? (
        <div className="empty-state">
          <strong>Your items will appear here</strong>
          Add products or services on the left to build this document.
        </div>
      ) : (
        <>
          {visible.map((s, n) => {
            const items = s.items.filter((i) => i.name.trim());
            const subtotal = sumItemsClient(items, doc.markupPercent);
            return (
              <section className="quote-section" key={s.id}>
                <div className="quote-section-head">
                  <span className="quote-section-num">
                    {String(n + 1).padStart(2, "0")}
                  </span>
                  <span className="quote-section-title">{s.name}</span>
                  {s.optional ? <span className="optional-tag">OPTIONAL</span> : null}
                </div>
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Item / description</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const unit = clientUnitPrice(i.price, doc.markupPercent);
                      return (
                        <tr key={i.id}>
                          <td>
                            <span className="item-name">
                              {displayItemName(s.name, i.name)}
                            </span>
                            {i.category || i.note ? (
                              <div className="item-note">
                                {[i.category, i.note].filter(Boolean).join(" · ")}
                              </div>
                            ) : null}
                          </td>
                          <td>{i.qty}</td>
                          <td>{formatMoney(unit, currency)}</td>
                          <td>{formatMoney(i.qty * unit, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="quote-section-subtotal">
                  {s.optional ? "Optional " : ""}
                  Section subtotal{" "}
                  <strong>{formatMoney(subtotal, currency)}</strong>
                </div>
              </section>
            );
          })}

          {(doc.installationPercent > 0 || t.installationOriginal > 0) && (
            <section className="quote-section">
              <div className="quote-section-head">
                <span className="quote-section-num">
                  {String(visible.length + 1).padStart(2, "0")}
                </span>
                <span className="quote-section-title">Installation</span>
              </div>
              <table className="quote-table">
                <thead>
                  <tr>
                    <th>Item / description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="item-name">
                        On-site installation and programming
                      </span>
                    </td>
                    <td>1</td>
                    <td>
                      {doc.installationFree ? (
                        <>
                          <span className="strike">
                            {formatMoney(t.installationOriginal, currency)}
                          </span>{" "}
                          {formatMoney(0, currency)}
                        </>
                      ) : (
                        formatMoney(t.installationOriginal, currency)
                      )}
                    </td>
                    <td>
                      {doc.installationFree ? (
                        <>
                          <span className="strike">
                            {formatMoney(t.installationOriginal, currency)}
                          </span>{" "}
                          <span className="complimentary">Complimentary</span>
                        </>
                      ) : (
                        formatMoney(t.installationAmount, currency)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="quote-section-subtotal">
                Section subtotal{" "}
                <strong>
                  {doc.installationFree ? (
                    <>
                      <span className="strike">
                        {formatMoney(t.installationOriginal, currency)}
                      </span>{" "}
                      {formatMoney(0, currency)}
                    </>
                  ) : (
                    formatMoney(t.installationAmount, currency)
                  )}
                </strong>
              </div>
            </section>
          )}
        </>
      )}

      <div className="quote-summary">
        <div className="total-line">
          <span>Included items</span>
          <strong>{formatMoney(t.productsClient, currency)}</strong>
        </div>
        {(doc.installationPercent > 0 || t.installationOriginal > 0) && (
          <div className="total-line">
            <span>Installation</span>
            <strong>
              {doc.installationFree ? (
                <>
                  <span className="strike">
                    {formatMoney(t.installationOriginal, currency)}
                  </span>{" "}
                  {formatMoney(0, currency)}
                </>
              ) : (
                formatMoney(t.installationAmount, currency)
              )}
            </strong>
          </div>
        )}
        {t.discount > 0 && (
          <div className="total-line">
            <span>
              Discount
              {doc.discountType === "percent"
                ? ` (${Math.min(100, doc.discountValue)}%)`
                : ""}
            </span>
            <strong>− {formatMoney(t.discount, currency)}</strong>
          </div>
        )}
        <div className="total-line final">
          <span>{totalLabel}</span>
          <strong>{formatMoney(t.grand, currency)}</strong>
        </div>
        {t.optionalClient > 0 && (
          <>
            <div className="total-line optional-summary">
              <span>Optional additions</span>
              <strong>+ {formatMoney(t.optionalClient, currency)}</strong>
            </div>
            <div className="total-line">
              <span>Total including options</span>
              <strong>{formatMoney(t.grand + t.optionalClient, currency)}</strong>
            </div>
          </>
        )}
      </div>

      {doc.clientNote.trim() ? (
        <div className="quote-note">
          <strong>Project note</strong>
          <p>{doc.clientNote}</p>
        </div>
      ) : null}

      <div className="terms-grid">
        {doc.paymentTerms.trim() ? (
          <div className="term">
            <strong>Payment terms</strong>
            <p>{doc.paymentTerms}</p>
          </div>
        ) : null}
        {doc.warrantyTerms.trim() ? (
          <div className="term">
            <strong>Warranty & exclusions</strong>
            <p>{doc.warrantyTerms}</p>
          </div>
        ) : null}
        {doc.extraTerms.trim() ? (
          <div className="term">
            <strong>Additional notes</strong>
            <p>{doc.extraTerms}</p>
          </div>
        ) : null}
      </div>

      <div className="quote-footer">
        <span>{doc.companyName || "SYNCIFY"} · Smart Home Automation</span>
        <span>{number}</span>
      </div>
    </article>
  );
}
