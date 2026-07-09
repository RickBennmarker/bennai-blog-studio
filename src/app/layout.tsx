import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SetupGate from "@/components/SetupGate";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BennAI Blog Studio",
  description:
    "Jouw AI-agent voor SEO en content: vindt kansen, schrijft blogs, genereert beelden en publiceert automatisch naar je CMS.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const setupComplete = settings.setup_complete;

  return (
    <html lang="nl" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className="font-sans">
        <SetupGate complete={setupComplete} />
        {setupComplete ? (
          <div className="flex min-h-dvh">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</div>
            </main>
          </div>
        ) : (
          <main className="min-h-dvh">{children}</main>
        )}
      </body>
    </html>
  );
}
