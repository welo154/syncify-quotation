import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNCIFY Studio",
  description: "Quotations and invoices for SYNCIFY smart home projects",
  themeColor: "#0a4e49",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
