"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/src/lib/utils";

export type TabItem<T extends string> = {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: ReactNode;
  tabClassName?: string;
  title?: string;
  value: T;
};

export function Tabs<T extends string>({
  "aria-label": ariaLabel = "Tabs",
  className,
  listClassName,
  setValue,
  tabs,
  value,
}: {
  "aria-label"?: string;
  className?: string;
  listClassName?: string;
  setValue: (value: T) => void;
  tabs: ReadonlyArray<TabItem<T>>;
  value: T;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeTab = tabs.find((tab) => tab.value === value);

  const updateIndicator = useCallback(() => {
    const activeTab = listRef.current?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );

    if (!activeTab) {
      setIndicator((current) =>
        current.left === 0 && current.width === 0
          ? current
          : { left: 0, width: 0 },
      );
      return;
    }

    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;
    setIndicator((current) =>
      current.left === left && current.width === width
        ? current
        : { left, width },
    );
  }, []);

  useLayoutEffect(() => {
    updateIndicator();

    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(list);

    const activeTab = list.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (activeTab) observer.observe(activeTab);

    return () => observer.disconnect();
  }, [updateIndicator, value]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    const enabledTabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ) ?? [],
    );
    if (!enabledTabs.length) return;

    event.preventDefault();
    const currentIndex = enabledTabs.indexOf(event.currentTarget);
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabledTabs.length - 1;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    }
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    }

    enabledTabs[nextIndex]?.focus();
    enabledTabs[nextIndex]?.click();
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "relative flex items-center gap-5 overflow-x-auto border-b",
          listClassName,
        )}
      >
        {tabs.map((tab) => {
          const active = tab.value === value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              disabled={tab.disabled}
              title={tab.title}
              onClick={() => setValue(tab.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "relative shrink-0 px-0.5 pb-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                active ? "text-primary" : "text-muted-foreground",
                tab.disabled
                  ? "cursor-not-allowed opacity-50"
                  : !active && "hover:text-foreground",
                tab.tabClassName,
              )}
            >
              {tab.label ?? tab.value}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary transition-[width,transform,opacity] duration-300 ease-out"
          style={{
            opacity: indicator.width ? 1 : 0,
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
      </div>

      {activeTab?.children !== undefined ? (
        <div key={activeTab.value} role="tabpanel" className={activeTab.className}>
          {activeTab.children}
        </div>
      ) : null}
    </div>
  );
}
