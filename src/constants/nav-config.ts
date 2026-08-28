import {
  CalendarDays,
  Car,
  Coffee,
  FileText,
  Gavel,
  Handshake,
  Images,
  LogOut,
  Megaphone,
  Newspaper,
  ShoppingBag,
  Ticket,
  Trophy,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export type MenuTranslationKey =
  | "agenda"
  | "cars.root"
  | "cars.submissions"
  | "cars.forms"
  | "cars.finalized"
  | "cars.classes"
  | "cars.contentField"
  | "awards.root"
  | "awards.bestOfShow"
  | "awards.bestInClass"
  | "awards.specialAwards"
  | "sponsors.root"
  | "sponsors.list"
  | "sponsors.contentField"
  | "judges.root"
  | "judges.list"
  | "judges.contentField"
  | "news"
  | "press"
  | "staticPages.root"
  | "staticPages.about"
  | "staticPages.howToGetThere"
  | "staticPages.charity"
  | "staticPages.whatToWear"
  | "staticPages.venue"
  | "gallery.root"
  | "gallery.items"
  | "gallery.contentField"
  | "volunteers.root"
  | "volunteers.submissions"
  | "volunteers.list"
  | "carsAndCoffee.root"
  | "carsAndCoffee.events"
  | "carsAndCoffee.submissions"
  | "shop"
  | "ticketsAndPackages"
  | "profile"
  | "logout";

export type NavChild = {
  titleKey: MenuTranslationKey;
  icon?: LucideIcon;
  href: string;
  disabled?: boolean;
  permissionKey?: string | string[];
};

export type NavItem = {
  titleKey: MenuTranslationKey;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
  permissionKey?: string | string[];
  children?: NavChild[];
  action?: "logout";
};

export const NAV_ITEMS: NavItem[] = [
  {
    titleKey: "cars.root",
    icon: Car,
    children: [
      {
        titleKey: "cars.submissions",
        href: "/app/cars/submissions",
        disabled: false,
      },
      { titleKey: "cars.forms", href: "/app/cars/forms", disabled: false },
      {
        titleKey: "cars.finalized",
        href: "/app/cars/finalized",
        disabled: false,
      },
      { titleKey: "cars.classes", href: "/app/cars/classes", disabled: false },
      {
        titleKey: "cars.contentField",
        href: "/app/cars/content-field",
        disabled: false,
      },
    ],
  },
  {
    titleKey: "agenda",
    icon: CalendarDays,
    href: "/app/agenda",
    disabled: false,
  },
  {
    titleKey: "awards.root",
    icon: Trophy,
    disabled: true,
    children: [
      { titleKey: "awards.bestOfShow", href: "/app/awards/best-of-show" },
      { titleKey: "awards.bestInClass", href: "/app/awards/best-in-class" },
      {
        titleKey: "awards.specialAwards",
        href: "/app/awards/special-awards",
      },
    ],
  },
  {
    titleKey: "sponsors.root",
    icon: Handshake,
    disabled: false,
    children: [
      {
        titleKey: "sponsors.list",
        href: "/app/sponsors/list",
        disabled: true,
      },
      {
        titleKey: "sponsors.contentField",
        href: "/app/sponsors/website-description",
        disabled: false,
      },
    ],
  },
  {
    titleKey: "judges.root",
    icon: Gavel,
    disabled: false,
    children: [
      { titleKey: "judges.list", href: "/app/judges/list", disabled: true },
      {
        titleKey: "judges.contentField",
        href: "/app/judges/website-descriptions",
        disabled: false,
      },
    ],
  },
  {
    titleKey: "news",
    icon: Newspaper,
    href: "/app/news",
    disabled: true,
  },
  {
    titleKey: "press",
    icon: Megaphone,
    href: "/app/press",
    disabled: true,
  },
  {
    titleKey: "staticPages.root",
    icon: FileText,
    disabled: true,
    children: [
      { titleKey: "staticPages.about", href: "/app/static-pages/about" },
      {
        titleKey: "staticPages.howToGetThere",
        href: "/app/static-pages/how-to-get-there",
      },
      {
        titleKey: "staticPages.charity",
        href: "/app/static-pages/charities",
      },
      {
        titleKey: "staticPages.whatToWear",
        href: "/app/static-pages/what-to-wear",
      },
      { titleKey: "staticPages.venue", href: "/app/static-pages/venue" },
    ],
  },
  {
    titleKey: "gallery.root",
    icon: Images,
    disabled: true,
    children: [
      { titleKey: "gallery.items", href: "/app/gallery/items" },
      {
        titleKey: "gallery.contentField",
        href: "/app/gallery/website-description",
      },
    ],
  },
  {
    titleKey: "volunteers.root",
    icon: Users,
    disabled: true,
    children: [
      {
        titleKey: "volunteers.submissions",
        href: "/app/volunteers/submissions",
      },
      { titleKey: "volunteers.list", href: "/app/volunteers/list" },
    ],
  },
  {
    titleKey: "carsAndCoffee.root",
    icon: Coffee,
    disabled: true,
    children: [
      {
        titleKey: "carsAndCoffee.events",
        href: "/app/cars-and-coffee/events",
      },
      {
        titleKey: "carsAndCoffee.submissions",
        href: "/app/cars-and-coffee/submissions",
      },
    ],
  },
  {
    titleKey: "shop",
    icon: ShoppingBag,
    href: "/app/shop",
    disabled: true,
  },
  {
    titleKey: "ticketsAndPackages",
    icon: Ticket,
    href: "/app/tickets-and-packages",
    disabled: true,
  },
  {
    titleKey: "profile",
    icon: UserCircle,
    href: "/app/profile",
    disabled: true,
  },
  { titleKey: "logout", icon: LogOut, action: "logout" },
] satisfies NavItem[];

export const menuConfig = NAV_ITEMS;
export const MenuConfig = () => NAV_ITEMS;
