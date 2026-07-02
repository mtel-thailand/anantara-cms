"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/src/lib/utils";
import { Button, type ButtonProps } from "./button";

function PopoverWrapper({
  ...props
}: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  container,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content> & {
  container?: ComponentProps<typeof PopoverPrimitive.Portal>["container"];
}) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface MainPopoverProps extends ComponentProps<
  typeof PopoverPrimitive.Root
> {
  container?: ComponentProps<typeof PopoverPrimitive.Portal>["container"];
  name?: ReactNode;
  trigger?: ReactElement;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  align?: ComponentProps<typeof PopoverPrimitive.Content>["align"];
  side?: ComponentProps<typeof PopoverPrimitive.Content>["side"];
  sideOffset?: ComponentProps<
    typeof PopoverPrimitive.Content
  >["sideOffset"];
  contentClassName?: string;
  triggerClassName?: string;
  buttonVariant?: ButtonProps["variant"];
  buttonSize?: ButtonProps["size"];
}

function Popover({
  container,
  name,
  trigger,
  title,
  description,
  children,
  align,
  side,
  sideOffset,
  contentClassName = "w-fit p-4",
  triggerClassName,
  buttonVariant = "outline",
  buttonSize,
  ...popoverProps
}: MainPopoverProps) {
  return (
    <PopoverWrapper {...popoverProps}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant={buttonVariant}
            size={buttonSize}
            className={triggerClassName}
          >
            {name}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={contentClassName}
        container={container}
      >
        {(title || description) && (
          <PopoverHeader className="mb-4">
            {title && <PopoverTitle>{title}</PopoverTitle>}
            {description && (
              <PopoverDescription>{description}</PopoverDescription>
            )}
          </PopoverHeader>
        )}
        {children}
      </PopoverContent>
    </PopoverWrapper>
  );
}

export {
  PopoverWrapper,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  Popover,
};
