import { notFound } from "next/navigation";
import { invoiceRowToPayload } from "@/app/actions/invoices";
import { AppHeader } from "@/components/AppHeader";
import { InvoiceEditorClient } from "@/components/InvoiceEditorClient";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
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
  });
  if (!invoice) notFound();

  const initial = invoiceRowToPayload(invoice);

  return (
    <>
      <AppHeader user={user} title="INVOICE STUDIO" />
      <InvoiceEditorClient
        id={invoice.id}
        initial={initial}
        meta={{
          createdBy: invoice.createdBy.name,
          updatedBy: invoice.updatedBy.name,
          createdAt: invoice.createdAt.toISOString(),
          updatedAt: invoice.updatedAt.toISOString(),
        }}
        events={invoice.events.map((e) => ({
          id: e.id,
          action: e.action,
          summary: e.summary,
          at: e.at.toISOString(),
          user: e.user,
        }))}
      />
    </>
  );
}
