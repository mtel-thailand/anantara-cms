import { LanguageToggle } from "@/src/components/language-toggle";
// import { useTheme } from "@/src/components/providers/theme-provider";
import { useTranslations } from "next-intl";
import Text from "../ui/text";

const Topbar = () => {
  const t = useTranslations("topbar");
  // const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full flex shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="w-full flex px-10 py-3">
        <div className="ml-auto flex flex-row items-center gap-2">
          <Text size="xs" weight="medium" color='muted-foreground'>
            {t("editLanguage")}
          </Text>
          <LanguageToggle />
          {/* <button
            type="button"
            aria-label={t("currentTheme", {
              theme: t(resolvedTheme),
            })}
            onClick={() =>
              // setTheme(resolvedTheme === "dark" ? "light" : "dark")
              setTheme("light")
            }
          >
            {t(resolvedTheme)}
          </button> */}
        </div>
      </div>
    </header>
  );
};
export default Topbar;
