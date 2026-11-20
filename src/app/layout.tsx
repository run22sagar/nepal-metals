import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: {
    default: "Nepal Metals — Gold & Silver",
    template: "%s | Nepal Metals",
  },
  description:
    "Nepal gold and silver reference prices, verified history and international comparisons.",
  applicationName: "Nepal Metals",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nepal Metals",
  },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#203d34",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await headers()).get("x-site-locale") === "ne" ? "ne" : "en";
  return (
    <html lang={locale}>
      <body>
        <a href="#main" className="skip-link">
          {locale === "ne" ? "मुख्य सामग्रीमा जानुहोस्" : "Skip to content"}
        </a>
        {children}
        {process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
