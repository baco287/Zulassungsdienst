import type { Metadata, Viewport } from "next";
import { Archivo, Manrope } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileCTA from "@/components/MobileCTA";
import Analytics from "@/components/Analytics";
import { site } from "@/lib/site";
import { NOINDEX } from "@/lib/features";
import "./globals.css";
import { ORG_ID, WEBSITE_ID } from "@/lib/catalog";

/* Schriften: Archivo (variable Breite) für Text und Überschriften, Manrope nur für
   die Wortmarke im Logo. Beide werden beim Build geladen und vom eigenen Server
   ausgeliefert (next/font) – es entsteht keine Verbindung zu Google beim Seitenaufruf. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const wordmark = Manrope({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-wordmark-face",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

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
  alternates: { canonical: "./" },
  // Bewusst ohne url/title/description: Next übernimmt dann Titel und
  // Beschreibung der jeweiligen Seite, og:url folgt dem Canonical ("./").
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    url: "./",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: NOINDEX ? { index: false, follow: false } : { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: site.name,
      description: site.description,
      url: site.url,
      logo: `${site.url}/logo.png`,
      email: site.contact.email,
      telephone: site.contact.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.company.street,
        addressLocality: "Berlin",
        postalCode: "10437",
        addressCountry: "DE",
      },
      areaServed: { "@type": "Country", name: "Deutschland" },
      knowsAbout: [
        "Kfz-Zulassung",
        "Neuzulassung",
        "Ummeldung",
        "Abmeldung",
        "Halterwechsel",
        "Wunschkennzeichen",
        "Kurzzeitkennzeichen",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: site.contact.phone,
        email: site.contact.email,
        availableLanguage: "German",
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "08:00",
          closes: "18:00",
        },
      },
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: site.url,
      name: site.name,
      description: site.description,
      inLanguage: "de",
      publisher: { "@id": ORG_ID },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${archivo.variable} ${wordmark.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a href="#hauptinhalt" className="skip-link">
          Zum Hauptinhalt springen
        </a>
        <Header />
        <main id="hauptinhalt" className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileCTA />
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
