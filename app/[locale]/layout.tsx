import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../../styles/globals.css";
import { routing } from "@/src/i18n/routing";
import enMessages from "@/messages/en.json";
import itMessages from "@/messages/it.json";
import { ThemeProvider } from "@/src/components/theme-provider";
import { Suspense } from "react";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const messages = {
  en: enMessages,
  it: itMessages,
} as const;

type Locale = keyof typeof messages;

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
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <Suspense fallback={null}>
          <NextIntlClientProvider
            locale={locale}
            messages={messages[locale]}
            timeZone="UTC"
          >
            {children}
          </NextIntlClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
