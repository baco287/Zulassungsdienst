import type { Metadata } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – ${site.claim}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "Kfz-Zulassung online",
    "Auto anmelden",
    "Auto abmelden",
    "Zulassungsdienst",
    "Ummeldung",
    "Halterwechsel",
    "Wunschkennzeichen",
  ],
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: `${site.name} – ${site.claim}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  description: site.description,
  url: site.url,
  email: site.contact.email,
  telephone: site.contact.phone,
  areaServed: "DE",
  priceRange: "€€",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a href="#hauptinhalt" className="skip-link">
          Zum Hauptinhalt springen
        </a>
        <Header />
        <main id="hauptinhalt" className="flex-1">
          {children}
        </main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
