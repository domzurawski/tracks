import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { SiteFooter } from "@/layout/site-footer";
import { SiteNav } from "@/layout/site-nav";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Tracks Inc. — Log the lap. Own the record.",
    template: "%s · Tracks Inc.",
  },
  description:
    "Track your lap times, compare against real drivers, and see exactly where you rank at Nürburgring, Le Mans, and Spa.",
  openGraph: {
    title: "Tracks Inc.",
    description:
      "Track your lap times, compare against real drivers, and see exactly where you rank at Nürburgring, Le Mans, and Spa.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-background font-body text-foreground antialiased">
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
