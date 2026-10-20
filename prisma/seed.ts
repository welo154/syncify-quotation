import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@syncify.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "change-me-on-first-deploy";
  const name = process.env.ADMIN_NAME || "SYNCIFY Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "admin",
      active: true,
    },
    create: {
      email,
      name,
      passwordHash,
      role: "admin",
      active: true,
    },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
