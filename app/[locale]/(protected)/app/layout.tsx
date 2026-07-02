import AppLayoutProvider from "@/src/components/providers/app-layout";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "@/src/i18n/navigation";
import { getLocale } from "next-intl/server";
import ModalProvider from "@/src/components/providers/modal-provider";
import { TooltipProvider } from "@/src/components/ui/tooltip";
import type { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const locale = await getLocale();

  if (error) {
    redirect({ href: "/auth/login", locale });
  }

  return (
    <ModalProvider>
      <AppLayoutProvider user={data ? data.claims : null}>
        <TooltipProvider>{children}</TooltipProvider>
      </AppLayoutProvider>
    </ModalProvider>
  );
}
