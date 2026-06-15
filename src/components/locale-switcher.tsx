"use client";

import clsx from "clsx";
import { useParams } from "next/navigation";
import { Locale, useLocale, useTranslations } from "next-intl";
import { ChangeEvent, ReactNode, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";
import { Popover } from "./ui/popover";

export default function LocaleSwitcher() {
  const [open, setOpen] = useState<boolean>(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();

  function onOpenChange(isOpen: boolean) {
    setOpen(isOpen);
  }

  function onSelectChange(locale: string) {
    const nextLocale = locale as Locale;
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params },
        { locale: nextLocale },
      );
      onOpenChange(false);
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      name={locale.toUpperCase()}
      contentClassName="w-fit p-0"
    >
      <div className="w-fit flex flex-col space-y-2">
        {routing.locales.map((locale) => (
          <span
            key={locale}
            onClick={() => onSelectChange(locale)}
            className={clsx(
              "w-full p-4 cursor-pointer duration-200",
              "hover:bg-black/5 hover:font-semibold ",
            )}
          >
            {locale.toUpperCase()}
          </span>
        ))}
      </div>
    </Popover>
  );
}
