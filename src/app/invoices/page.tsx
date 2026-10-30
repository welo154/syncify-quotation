import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CreateInvoiceButton } from "@/components/CreateInvoiceButton";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await prisma.invoice.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
    take: 100,
  });

  return (
    <>
      <AppHeader user={user} title="INVOICE STUDIO" />
      <div className="list-page">
        <div className="list-header">
          <div>
            <span className="eyebrow">DOCUMENTS</span>
            <h1>Invoices</h1>
          </div>
          <CreateInvoiceButton />
        </div>
        <table className="list-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Created by</th>
              <th>Last edited</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No invoices yet. Create one or convert from a quotation.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                    <div className="muted">{inv.projectName || "—"}</div>
                  </td>
                  <td>{inv.clientName || "Untitled"}</td>
                  <td>
                    {inv.createdBy.name}
                    <div className="muted">{inv.createdAt.toLocaleString()}</div>
                  </td>
                  <td>
                    {inv.updatedBy.name}
                    <div className="muted">{inv.updatedAt.toLocaleString()}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${inv.status}`}>{inv.status}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link className="button outline" href={`/invoices/${inv.id}`}>
                        Open
                      </Link>
                      <DeleteDocumentButton
                        kind="invoice"
                        id={inv.id}
                        label={inv.invoiceNumber}
                      />
                    </div>
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
