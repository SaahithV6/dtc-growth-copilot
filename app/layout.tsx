import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "DTC Growth Copilot",
  description: "Hackathon MVP for DTC growth strategy and ad creation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-zinc-950 text-zinc-50">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
