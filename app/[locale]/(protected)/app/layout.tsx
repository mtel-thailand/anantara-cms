import { DeployButton } from "@/src/components/deploy-button";
import { EnvVarWarning } from "@/src/components/env-var-warning";
import { AuthButton } from "@/src/components/auth-button";
import { hasEnvVars } from "@/src/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import LocaleSwitcher from "@/src/components/locale-switcher";
import AppLayoutProvider from "@/src/components/layout/app-layout";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "@/src/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const locale = await getLocale();

  if (error) {
    redirect({ href: "/auth/login", locale });
  }

  return (
    <AppLayoutProvider user={data ? data.claims : null}>
      {children}
    </AppLayoutProvider>
  );
}
