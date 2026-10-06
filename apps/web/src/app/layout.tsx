import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "RythuConnect | Direct Farmer-to-Buyer Agriculture Marketplace",
  description:
    "RythuConnect connects farmers directly with buyers across India for fair crop pricing, fresh produce sourcing, and transparent agricultural trade.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
