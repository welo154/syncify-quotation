import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT 'public.products' AS source, COUNT(*)::int AS count FROM public.products
    UNION ALL SELECT 'public.quotations', COUNT(*)::int FROM public.quotations
    UNION ALL SELECT 'public.quotation_sections', COUNT(*)::int FROM public.quotation_sections
    UNION ALL SELECT 'public.quotation_items', COUNT(*)::int FROM public.quotation_items
    UNION ALL SELECT 'studio.User', COUNT(*)::int FROM studio."User"
    UNION ALL SELECT 'studio.Quote', COUNT(*)::int FROM studio."Quote"
    UNION ALL SELECT 'studio.Product', COUNT(*)::int FROM studio."Product"
  `);
  console.log(JSON.stringify(rows, null, 2));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
