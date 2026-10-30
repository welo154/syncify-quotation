import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CreateQuoteButton } from "@/components/CreateQuoteButton";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function QuotesPage() {
  const user = await requireUser();
  const quotes = await prisma.quote.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
    take: 100,
  });

  return (
    <>
      <AppHeader user={user} title="QUOTATION STUDIO" />
      <div className="list-page">
        <div className="list-header">
          <div>
            <span className="eyebrow">DOCUMENTS</span>
            <h1>Quotations</h1>
          </div>
          <CreateQuoteButton />
        </div>
        <table className="list-table">
          <thead>
            <tr>
              <th>Quote</th>
              <th>Client</th>
              <th>Created by</th>
              <th>Last edited</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No quotations yet. Create your first one.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quotes/${q.id}`}>{q.quoteNumber}</Link>
                    <div className="muted">{q.projectName || "—"}</div>
                  </td>
                  <td>{q.clientName || "Untitled"}</td>
                  <td>
                    {q.createdBy.name}
                    <div className="muted">{q.createdAt.toLocaleString()}</div>
                  </td>
                  <td>
                    {q.updatedBy.name}
                    <div className="muted">{q.updatedAt.toLocaleString()}</div>
                  </td>
                  <td>
                    <span className="status-pill">{q.status}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link className="button outline" href={`/quotes/${q.id}`}>
                        Open
                      </Link>
                      <DeleteDocumentButton kind="quote" id={q.id} label={q.quoteNumber} />
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
