import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayGuard — Freelancer Payment Protection",
  description:
    "Freelancer Payment Protection with AI Arbitration on GenLayer Studionet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
