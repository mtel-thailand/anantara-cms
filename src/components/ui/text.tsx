import { ElementType, ReactNode } from "react";
import { cn } from "@/src/lib/utils";

const fontStyle = {
  sans: "font-sans",
  mono: "font-mono",
  heading: "font-heading",
  serif: "font-serif",
};

const fontWeight = {
  thin: "font-thin",
  extralight: "font-extralight",
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
  black: "font-black",
  inherit: "",
} as const;

const textColorClass = {
  foreground: "text-foreground",
  "muted-foreground": "text-muted-foreground",
  primary: "text-primary",
  "primary-foreground": "text-primary-foreground",
  secondary: "text-secondary-foreground",
  "secondary-foreground": "text-secondary-foreground",
  accent: "text-accent-foreground",
  "accent-foreground": "text-accent-foreground",
  destructive: "text-destructive",
  "destructive-foreground": "text-destructive-foreground",
  card: "text-card-foreground",
  "card-foreground": "text-card-foreground",
  popover: "text-popover-foreground",
  "popover-foreground": "text-popover-foreground",
  sidebar: "text-sidebar-foreground",
  "sidebar-foreground": "text-sidebar-foreground",
  "sidebar-primary": "text-sidebar-primary",
  "sidebar-primary-foreground": "text-sidebar-primary-foreground",
  "sidebar-accent": "text-sidebar-accent-foreground",
  "sidebar-accent-foreground": "text-sidebar-accent-foreground",
  inherit: "",

  // Legacy aliases. Prefer the semantic names above for new code.
  text: "text-foreground",
  "light-gold": "text-primary",
  black: "text-foreground",
  "dark-gray": "text-muted-foreground",
  "light-gray-2": "text-muted-foreground",
  white: "text-primary-foreground",
  "red-1": "text-destructive",
  "medium-gray": "text-muted-foreground",
} as const;

type TextProps<T extends ElementType = "p"> = {
  component?: T;
  size?:
    | "class"
    | "xs"
    | "sm"
    | "base"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl";
  color?: keyof typeof textColorClass;
  className?: string;
  font?: keyof typeof fontStyle;
  weight?: keyof typeof fontWeight;
  children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "children" | "component">;

const Text = <T extends ElementType = "p">({
  component,
  size = "base",
  color = "text",
  className = "",
  font = "sans",
  weight,
  style,
  children,
}: TextProps<T>) => {
  const Component = component || "p";

  const sizeClass = {
    class: "",
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
    "6xl": "text-[52px]",
  }[size];

  const colorClass = {
    ...textColorClass,
  }[color];

  const fontClass = font ? fontStyle[font] : undefined;
  const weightClass = weight ? fontWeight[weight] : undefined;

  return (
    <Component
      className={cn(
        sizeClass,
        colorClass,
        fontClass,
        weightClass,
        "whitespace-pre-line",
        className,
      )}
      style={style}
    >
      {children}
    </Component>
  );
};

const FormTitle = ({
  children,
  className,
  color = "foreground",
  size = "2xl",
  weight,
}: {
  children: ReactNode;
  className?: string;
  color?: keyof typeof textColorClass;
  size?: TextProps["size"];
  weight?: TextProps["weight"];
}) => (
  <Text
    font="heading"
    size={size}
    color={color}
    weight={weight}
    className={className}
  >
    {children}
  </Text>
);

Text.FormTitle = FormTitle;

export default Text;
