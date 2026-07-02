import type { Metadata } from "next";
import { EB_Garamond, Figtree, Playfair_Display } from "next/font/google";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../../styles/globals.css";
import { routing } from "@/src/i18n/routing";
import enMessages from "@/messages/en.json";
import itMessages from "@/messages/it.json";
import { ThemeProvider } from "@/src/components/providers/theme-provider";
import { Suspense } from "react";
import { Toaster } from "@/src/components/ui/sonner";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
});

// Serif body face for the public-site WYSIWYG editor / preview (alongside
// Playfair). Includes the 600 weight used by the "SemiBold" font option.
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
const messages = {
  en: enMessages,
  it: itMessages,
} as const;

type Locale = keyof typeof messages;

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: requestedLocale } = (await params) as { locale?: string };

  if (!hasLocale(routing.locales, requestedLocale)) {
    notFound();
  }

  const locale = requestedLocale as Locale;

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${figtree.variable} ${playfair.variable} ${ebGaramond.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <Suspense fallback={null}>
          <NextIntlClientProvider
            locale={locale}
            messages={messages[locale]}
            timeZone="UTC"
          >
            <ThemeProvider>
              <Toaster />
              {children}
            </ThemeProvider>
          </NextIntlClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
