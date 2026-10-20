"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createQuoteAction } from "@/app/actions/quotes";

export function CreateQuoteButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="button primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createQuoteAction();
          if (res.id) router.push(`/quotes/${res.id}`);
        })
      }
    >
      {pending ? "Creating…" : "New quotation"}
    </button>
  );
}
