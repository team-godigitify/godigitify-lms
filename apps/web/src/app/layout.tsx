import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Godigitify CRM",
  description:
    "Godigitify's CRM — track, manage, and convert digital marketing leads efficiently across all your campaigns and channels.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Godigitify — Lead Management System",
    description:
      "Godigitify's Lead Management System — track, manage, and convert digital marketing leads efficiently across all your campaigns and channels.",
    type: "website",
    images: [
      { url: "/logo.png", width: 512, height: 512, alt: "Godigitify Logo" },
    ],
  },
  twitter: {
    card: "summary",
    title: "Godigitify — Lead Management System",
    description:
      "Godigitify's Lead Management System — track, manage, and convert digital marketing leads efficiently.",
    images: ["/logo.png"],
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
