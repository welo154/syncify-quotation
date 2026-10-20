"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { finite } from "@/lib/money";

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-");
}

function readProductFields(formData: FormData) {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 2000);
  const unit = String(formData.get("unit") ?? "piece").trim().slice(0, 40) || "piece";
  const unitPrice = finite(formData.get("unitPrice"));
  const currencyRaw = String(formData.get("currency") ?? "EGP");
  const currency = ["EGP", "USD", "EUR"].includes(currencyRaw) ? currencyRaw : "EGP";
  const active = String(formData.get("active") ?? "true") !== "false";

  if (!code || code.length > 60) {
    throw new Error("Product code is required (max 60 characters).");
  }
  if (!name || name.length > 300) {
    throw new Error("Product name is required (max 300 characters).");
  }

  return { code, name, category, description, unit, unitPrice, currency, active };
}

export async function createProductAction(formData: FormData): Promise<void> {
  await requireUser();
  const data = readProductFields(formData);

  const existing = await prisma.product.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new Error(`A product with code ${data.code} already exists.`);
  }

  await prisma.product.create({ data });
  revalidatePath("/products");
}

export async function updateProductAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  const data = readProductFields(formData);

  const clash = await prisma.product.findFirst({
    where: { code: data.code, NOT: { id } },
  });
  if (clash) {
    throw new Error(`A product with code ${data.code} already exists.`);
  }

  await prisma.product.update({
    where: { id },
    data,
  });
  revalidatePath("/products");
}

export async function setProductActiveAction(
  productId: string,
  active: boolean
): Promise<void> {
  await requireUser();
  await prisma.product.update({
    where: { id: productId },
    data: { active },
  });
  revalidatePath("/products");
}
