"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function createUserAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";

  if (!email || !name || password.length < 6) {
    throw new Error("Name, email, and password (min 6 chars) are required.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, name, passwordHash, role, active: true },
  });

  revalidatePath("/admin/users");
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id && !active) {
    return { error: "You cannot deactivate your own account." };
  }
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: "admin" | "staff") {
  const admin = await requireAdmin();
  if (userId === admin.id && role !== "admin") {
    return { error: "You cannot remove your own admin role." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserPasswordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/users");
}
