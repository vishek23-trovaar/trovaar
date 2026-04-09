import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { NavbarWrapper, FooterWrapper } from "@/components/layout/NavbarRouter";
import CrispChat from "@/components/CrispChat";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://trovaar.com'),
  title: {
    default: "Trovaar — Stop searching, start finding.",
    template: "%s | Trovaar",
  },
  description: "Snap a photo of your project or expensive estimate. Get competitive bids from skilled local contractors. Save money, stop price gouging.",
  keywords: [
    "home services",
    "contractors",
    "competitive bids",
    "plumber",
    "electrician",
    "handyman",
    "local pros",
    "home repair",
    "escrow protection",
    "verified contractors",
  ],
  alternates: {
    canonical: "https://trovaar.com",
  },
  openGraph: {
    title: "Trovaar — Get Competitive Bids from Skilled Pros",
    description: "Post any home, auto, or commercial job and watch local pros compete for your business with real bids.",
    url: "https://trovaar.com",
    siteName: "Trovaar",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trovaar — Get Competitive Bids from Skilled Pros",
    description: "Post any job and watch local pros compete for your business.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <NavbarWrapper />
          <main id="main-content" className="flex-1">{children}</main>
          <FooterWrapper />
          <CrispChat />
        </AuthProvider>
        {/* Schema.org Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Trovaar",
              url: "https://trovaar.com",
              logo: "https://trovaar.com/og-image.png",
              description:
                "Trovaar connects homeowners with verified local contractors. Post a job, get competitive bids, and hire with escrow protection.",
              sameAs: [],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                availableLanguage: "English",
              },
            }),
          }}
        />
        {/* Schema.org WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Trovaar",
              url: "https://trovaar.com",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://trovaar.com/jobs?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
