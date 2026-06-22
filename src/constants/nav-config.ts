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
  | "cars.classes"
  | "cars.list"
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
  permissionKey?: string | string[];
};

export type NavItem = {
  titleKey: MenuTranslationKey;
  icon: LucideIcon;
  href?: string;
  permissionKey?: string | string[];
  children?: NavChild[];
  action?: "logout";
};

export const NAV_ITEMS: NavItem[] = [
  { titleKey: "agenda", icon: CalendarDays, href: "/app/agenda" },
  {
    titleKey: "cars.root",
    icon: Car,
    children: [
      { titleKey: "cars.submissions", href: "/cars/submissions" },
      { titleKey: "cars.classes", href: "/cars/classes" },
      { titleKey: "cars.list", href: "/cars/list" },
      {
        titleKey: "cars.contentField",
        href: "/cars/website-description",
      },
    ],
  },
  {
    titleKey: "awards.root",
    icon: Trophy,
    children: [
      { titleKey: "awards.bestOfShow", href: "/awards/best-of-show" },
      { titleKey: "awards.bestInClass", href: "/awards/best-in-class" },
      { titleKey: "awards.specialAwards", href: "/awards/special-awards" },
    ],
  },
  {
    titleKey: "sponsors.root",
    icon: Handshake,
    children: [
      { titleKey: "sponsors.list", href: "/sponsors/list" },
      {
        titleKey: "sponsors.contentField",
        href: "/sponsors/website-description",
      },
    ],
  },
  {
    titleKey: "judges.root",
    icon: Gavel,
    children: [
      { titleKey: "judges.list", href: "/judges/list" },
      {
        titleKey: "judges.contentField",
        href: "/judges/website-descriptions",
      },
    ],
  },
  { titleKey: "news", icon: Newspaper, href: "/news" },
  { titleKey: "press", icon: Megaphone, href: "/press" },
  {
    titleKey: "staticPages.root",
    icon: FileText,
    children: [
      { titleKey: "staticPages.about", href: "/static-pages/about" },
      {
        titleKey: "staticPages.howToGetThere",
        href: "/static-pages/how-to-get-there",
      },
      { titleKey: "staticPages.charity", href: "/static-pages/charities" },
      {
        titleKey: "staticPages.whatToWear",
        href: "/static-pages/what-to-wear",
      },
      { titleKey: "staticPages.venue", href: "/static-pages/venue" },
    ],
  },
  {
    titleKey: "gallery.root",
    icon: Images,
    children: [
      { titleKey: "gallery.items", href: "/gallery/items" },
      {
        titleKey: "gallery.contentField",
        href: "/gallery/website-description",
      },
    ],
  },
  {
    titleKey: "volunteers.root",
    icon: Users,
    children: [
      { titleKey: "volunteers.submissions", href: "/volunteers/submissions" },
      { titleKey: "volunteers.list", href: "/volunteers/list" },
    ],
  },
  {
    titleKey: "carsAndCoffee.root",
    icon: Coffee,
    children: [
      {
        titleKey: "carsAndCoffee.events",
        href: "/cars-and-coffee/events",
      },
      {
        titleKey: "carsAndCoffee.submissions",
        href: "/cars-and-coffee/submissions",
      },
    ],
  },
  { titleKey: "shop", icon: ShoppingBag, href: "/shop" },
  {
    titleKey: "ticketsAndPackages",
    icon: Ticket,
    href: "/tickets-and-packages",
  },
  { titleKey: "profile", icon: UserCircle, href: "/profile" },
  { titleKey: "logout", icon: LogOut, action: "logout" },
] satisfies NavItem[];

export const menuConfig = NAV_ITEMS;
export const MenuConfig = () => NAV_ITEMS;
