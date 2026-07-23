import { LanguageToggle } from "@/src/components/language-toggle";
import { useTheme } from "@/src/components/providers/theme-provider";

const Topbar = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full flex shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="w-full flex px-10 py-3">
        <div className="ml-auto flex flex-row items-center gap-2">
          <p>Edit language</p>
          <LanguageToggle />
          <button
            type="button"
            onClick={() =>
              // setTheme(resolvedTheme === "dark" ? "light" : "dark")
              setTheme('light')
            }
          >
            {resolvedTheme}
          </button>
        </div>
      </div>
    </header>
  );
};
export default Topbar;
