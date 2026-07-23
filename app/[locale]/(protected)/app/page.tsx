import { redirect } from "@/src/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function ClassesPage() {
  const locale = await getLocale();
  return redirect({ href: "/app/cars/submissions", locale });
}
