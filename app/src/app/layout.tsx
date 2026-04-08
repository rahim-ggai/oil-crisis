import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pakistan Energy Crisis Simulation",
  description: "Crisis Simulation & Decision Support System — National Energy Security Working Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
