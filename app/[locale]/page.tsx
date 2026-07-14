import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "@/src/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function Home() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    redirect({ href: "/auth/login", locale });
  }

  if (data) {
    redirect({ href: "/app", locale });
  }

  return redirect({ href: "/app", locale });
}
