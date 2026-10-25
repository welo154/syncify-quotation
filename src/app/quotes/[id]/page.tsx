import { notFound } from "next/navigation";
import { listCatalogProducts } from "@/app/actions/products";
import { quoteRowToPayload } from "@/app/actions/quotes";
import { AppHeader } from "@/components/AppHeader";
import { QuoteEditorClient } from "@/components/QuoteEditorClient";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [quote, products] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        events: {
          orderBy: { at: "desc" },
          take: 30,
          include: { user: { select: { name: true } } },
        },
      },
    }),
    listCatalogProducts(),
  ]);
  if (!quote) notFound();

  const initial = quoteRowToPayload(quote);

  return (
    <>
      <AppHeader user={user} title="QUOTATION STUDIO" />
      <QuoteEditorClient
        id={quote.id}
        initial={initial}
        meta={{
          createdBy: quote.createdBy.name,
          updatedBy: quote.updatedBy.name,
          createdAt: quote.createdAt.toISOString(),
          updatedAt: quote.updatedAt.toISOString(),
        }}
        events={quote.events.map((e) => ({
          id: e.id,
          action: e.action,
          summary: e.summary,
          at: e.at.toISOString(),
          user: e.user,
        }))}
        products={products}
      />
    </>
  );
}
