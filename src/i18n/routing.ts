import { defineRouting } from "next-intl/routing";
import { locales } from "@/src/constants/locale";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: locales,

  // Used when no locale matches
  defaultLocale: locales[0],
  localePrefix: "always",
});
