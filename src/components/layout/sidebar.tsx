"use client";

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import AnantaraLogoBlack from "@/public/images/logo-black.png";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { type NavChild, type NavItem } from "@/src/constants/nav-config";
import { createClient } from "@/src/lib/supabase/client";
import { Link, usePathname, useRouter } from "@/src/i18n/navigation";
import { Button } from "@/src/components/ui/button";
import {
  selectIsMenuExpanded,
  selectSetMenuExpanded,
  selectSetSidebarWidth,
  selectToggleMenuExpanded,
  selectWidth,
  useSidebarStore,
} from "@/src/stores/sidebar-store";
import useAsync from "@/src/hooks/use-async";
import { useModal } from "@/src/components/providers/modal-provider";
import Text from "@/src/components/ui/text";

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[11px] font-semibold tabular-nums text-primary-foreground">
      {count}
    </span>
  );
}

function NavChildItem({ child, count }: { child: NavChild; count: number }) {
  const t = useTranslations("menu");
  const pathname = usePathname();
  const isActive =
    pathname === child.href || pathname.startsWith(`${child.href}/`);
  const Icon = child.icon;

  return (
    <li>
      <Link
        href={child.href}
        className={clsx(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-accent",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0" /> : null}
        <span className="truncate">{t(child.titleKey)}</span>
        {count > 0 ? <CountBadge count={count} /> : null}
      </Link>
    </li>
  );
}

function NavItemButton({
  item,
  counts,
}: {
  item: NavItem;
  counts: Record<string, number>;
}) {
  const t = useTranslations("menu");
  const pathname = usePathname();
  const router = useRouter();
  const Icon = item.icon;
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : false;
  const hasActiveChild = item.children?.some(
    (child) => child.href === pathname || pathname.startsWith(`${child.href}/`),
  );
  const hasChildAlert = item.children?.some(
    (child) => (counts[child.href] ?? 0) > 0,
  );
  const isExpanded = useSidebarStore(selectIsMenuExpanded(item.titleKey));
  const setMenuExpanded = useSidebarStore(selectSetMenuExpanded);
  const toggleMenuExpanded = useSidebarStore(selectToggleMenuExpanded);

  const modal = useModal();
  const { execute } = useAsync();

  useEffect(() => {
    if (hasActiveChild) {
      setMenuExpanded(item.titleKey, true);
    }
  }, [hasActiveChild, item.titleKey, setMenuExpanded]);

  const handleLogout = async () => {
    return execute<[], void>(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    });
  };

  const handleOpenLogoutModal = () => {
    modal.open({
      className: "gap-0",
      headerClassName: "border-b-0 px-4",
      header: (
        <>
          <Text.FormTitle size="base" className="font-medium">
            Log out of the CMS?
          </Text.FormTitle>
          <Text size="sm" color="muted-foreground">
            You will be signed out and returned to the login page.
          </Text>
        </>
      ),
      footer: ({ loading, close, run }) => (
        <>
          <Button variant="outline" disabled={loading} onClick={close}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={loading}
            onClick={() => void run(handleLogout)}
          >
            Logout
          </Button>
        </>
      ),
    });
    modal.handleHideShowCloseButton();
    modal.disableBackdropClose();
  };

  if (item.action === "logout") {
    return (
      <Button
        type="button"
        onClick={handleOpenLogoutModal}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 hover:text-neutral-950"
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{t(item.titleKey)}</span>
      </Button>
    );
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={clsx(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-accent",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{t(item.titleKey)}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <div
        aria-expanded={isExpanded}
        onClick={() => toggleMenuExpanded(item.titleKey)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer",
          hasActiveChild
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-accent",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex flex-1 gap-1 truncate">
          <span className="truncate">{t(item.titleKey)}</span>
          {hasChildAlert ? (
            <span
              aria-label="Has new submissions"
              className="size-1.5 rounded-full bg-primary"
            />
          ) : null}
        </span>
        <ChevronDown
          strokeWidth={1.75}
          className={clsx(
            "size-3.5 shrink-0 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </div>
      <div
        className={clsx(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden flex flex-col ml-4 border-l">
          <ul className="space-y-1 pl-2 pt-1">
            {item.children?.map((child) => (
              <NavChildItem
                key={child.href}
                child={child}
                count={counts[child.href] ?? 0}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const MIN_WIDTH = 250;
const MAX_WIDTH = 500;

export default function Sidebar({ menu }: { menu: NavItem[] }) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(MIN_WIDTH);

  const sidebarWidth = useSidebarStore(selectWidth);
  const setSidebarWidth = useSidebarStore(selectSetSidebarWidth);

  const navCounts: Record<string, number> = {
    "/app/cars/submissions": 4,
  };

  const startResize = (event: ReactMouseEvent<HTMLButtonElement>) => {
    dragStartXRef.current = event.clientX;
    dragStartWidthRef.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const movement = e.clientX - dragStartXRef.current;
      const newWidth = dragStartWidthRef.current + movement;
      const currentWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setSidebarWidth(currentWidth);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={sidebarRef}
      className="flex h-full shrink-0 flex-row content-animate-in"
    >
      <div
        className={clsx(
          "flex h-full flex-col items-center border-r bg-sidebar",
          "bg-sidebar transition-opacity",
        )}
        style={{
          width: `${sidebarWidth}px`,
        }}
      >
        <Image
          src={AnantaraLogoBlack}
          alt="Anantara Concorso Roma"
          width={132}
          height={132}
          priority
          className="my-4"
        />
        <aside className="w-full flex-1 overflow-y-auto px-3 pb-4">
          <nav className="space-y-1">
            {menu.map((item) => (
              <NavItemButton
                key={item.titleKey}
                item={item}
                counts={navCounts}
              />
            ))}
          </nav>
        </aside>
      </div>
      <button
        className="group h-full w-2 cursor-col-resize bg-black py-2"
        onMouseDown={startResize}
      >
        <div className="w-0.5 h-full rounded-lg mx-auto group-hover:bg-white duration-200" />
      </button>
    </div>
  );
}
