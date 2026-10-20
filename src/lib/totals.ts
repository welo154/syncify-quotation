import { finite } from "./money";
import type { DiscountType, DocumentPayload, Section } from "./types";

const DISCOUNT_WARN_PERCENT = 7;

export type Totals = {
  productsBase: number;
  productsClient: number;
  installationOriginal: number;
  installationAmount: number;
  includedClient: number;
  optionalClient: number;
  discount: number;
  grand: number;
  discountExceedsLimit: boolean;
  effectiveDiscountPercent: number;
};

function markUp(price: number, markupPercent: number): number {
  return finite(price) * (1 + finite(markupPercent) / 100);
}

export function productSections(sections: Section[]): Section[] {
  return sections.filter((s) => !s.locked);
}

export function sumItemsClient(
  items: { qty: number; price: number }[],
  markupPercent: number
): number {
  return items.reduce(
    (a, i) => a + finite(i.qty) * markUp(i.price, markupPercent),
    0
  );
}

export function computeTotals(doc: DocumentPayload): Totals {
  const markup = finite(doc.markupPercent);
  const productSecs = productSections(doc.sections);
  const included = productSecs.filter((s) => !s.optional);
  const optional = productSecs.filter((s) => s.optional);

  const productsBase = included.reduce(
    (a, s) => a + s.items.reduce((b, i) => b + finite(i.qty) * finite(i.price), 0),
    0
  );
  const productsClient = included.reduce(
    (a, s) => a + sumItemsClient(s.items, markup),
    0
  );
  const optionalClient = optional.reduce(
    (a, s) => a + sumItemsClient(s.items, markup),
    0
  );

  const installationOriginal =
    productsClient * (finite(doc.installationPercent) / 100);
  const installationAmount = doc.installationFree ? 0 : installationOriginal;

  const includedClient = productsClient + installationAmount;

  let discount = 0;
  if (doc.discountType === "percent") {
    discount = includedClient * Math.min(100, finite(doc.discountValue)) / 100;
  } else if (doc.discountType === "fixed") {
    discount = Math.min(includedClient, finite(doc.discountValue));
  }

  const effectiveDiscountPercent =
    includedClient > 0 ? (discount / includedClient) * 100 : 0;

  const discountExceedsLimit =
    doc.discountType === "percent"
      ? finite(doc.discountValue) > DISCOUNT_WARN_PERCENT
      : doc.discountType === "fixed"
        ? effectiveDiscountPercent > DISCOUNT_WARN_PERCENT
        : false;

  return {
    productsBase,
    productsClient,
    installationOriginal,
    installationAmount,
    includedClient,
    optionalClient,
    discount,
    grand: Math.max(0, includedClient - discount),
    discountExceedsLimit,
    effectiveDiscountPercent,
  };
}

export function clientUnitPrice(basePrice: number, markupPercent: number): number {
  return markUp(basePrice, markupPercent);
}

export function needsDiscountAck(
  discountType: DiscountType,
  discountValue: number,
  includedClient: number
): boolean {
  if (discountType === "percent") return finite(discountValue) > DISCOUNT_WARN_PERCENT;
  if (discountType === "fixed") {
    if (includedClient <= 0) return false;
    return (finite(discountValue) / includedClient) * 100 > DISCOUNT_WARN_PERCENT;
  }
  return false;
}

export { DISCOUNT_WARN_PERCENT };
