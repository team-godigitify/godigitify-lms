import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Defynn CRM",
  description:
    "Defynn's CRM — track, manage, and convert digital marketing leads efficiently across all your campaigns and channels.",
  openGraph: {
    title: "Defynn — Lead Management System",
    description:
      "Defynn's Lead Management System — track, manage, and convert digital marketing leads efficiently across all your campaigns and channels.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Defynn — Lead Management System",
    description:
      "Defynn's Lead Management System — track, manage, and convert digital marketing leads efficiently.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
