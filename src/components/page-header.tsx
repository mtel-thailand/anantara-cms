import { cn } from "@/src/lib/utils";
import { GenericTooltip } from "./ui/tooltip";
import { Monitor, Smartphone } from "lucide-react";

type Viewport = "desktop" | "mobile";

function ViewportBadges({ viewport }: { viewport: Viewport[] }) {
  const ViewPortMeta: Record<
    Viewport,
    { icon: typeof Monitor; label: string }
  > = {
    desktop: { icon: Monitor, label: "Manages website content" },
    mobile: { icon: Smartphone, label: "Manages app content" },
  };

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      {viewport.map((item, index) => {
        const { icon, label } = ViewPortMeta[item];
        const Icon = icon;

        return (
          <GenericTooltip
            key={index}
            trigger={
              <span
                aria-label={label}
                className="flex size-6 items-center justify-center rounded-md border bg-muted/40"
              >
                <Icon className="size-3.5" />
              </span>
            }
            content={label}
          />
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  titleAccessory,
  viewport,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** Rendered inline to the right of the title (e.g. a status badge). */
  titleAccessory?: React.ReactNode;
  /** Which surfaces this page's content drives — shown as icons after the title. */
  viewport?: Viewport[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl tracking-tight text-foreground">
            {title}
          </h1>
          {viewport && <ViewportBadges viewport={viewport} />}
          {titleAccessory}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      ) : null}
    </div>
  );
}
