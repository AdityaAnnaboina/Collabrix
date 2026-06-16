import type { Metadata } from "next";
import { AuthInitializer } from "../components/AuthInitializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google Meet Clone - Enterprise Video Conferencing",
  description: "A complete real-time video conferencing platform featuring crystal-clear audio, HD video, screen sharing, chat, waiting lobbies, and active speaker focus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0B0F19] text-[#F3F4F6]">
        <AuthInitializer>
          {children}
        </AuthInitializer>
      </body>
    </html>
  );
}
