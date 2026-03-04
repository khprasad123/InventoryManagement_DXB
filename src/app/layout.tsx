import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import favicon16 from "@/lib/logo/favicon/favicon-16x16.png";
import favicon32 from "@/lib/logo/favicon/favicon-32x32.png";
import favicon48 from "@/lib/logo/favicon/favicon-48x48.png";
import favicon64 from "@/lib/logo/favicon/favicon-64x64.png";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "KaHa Enterprise Cloud",
  description: "Business management platform for inventory, sales, purchases, and more",
  icons: {
    icon: [
      { url: favicon16.src, sizes: "16x16", type: "image/png" },
      { url: favicon32.src, sizes: "32x32", type: "image/png" },
      { url: favicon48.src, sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: favicon64.src, sizes: "64x64", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
