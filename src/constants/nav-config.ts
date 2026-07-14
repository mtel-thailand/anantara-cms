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
  {
    titleKey: "cars.root",
    icon: Car,
    children: [
      { titleKey: "cars.submissions", href: "/app/cars/submissions" },
      { titleKey: "cars.classes", href: "/app/cars/classes" },
      { titleKey: "cars.list", href: "/app/cars/list" },
      {
        titleKey: "cars.contentField",
        href: "/app/cars/website-description",
      },
    ],
  },
  { titleKey: "agenda", icon: CalendarDays, href: "/app/agenda" },
  {
    titleKey: "awards.root",
    icon: Trophy,
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
    children: [
      { titleKey: "sponsors.list", href: "/app/sponsors/list" },
      {
        titleKey: "sponsors.contentField",
        href: "/app/sponsors/website-description",
      },
    ],
  },
  {
    titleKey: "judges.root",
    icon: Gavel,
    children: [
      { titleKey: "judges.list", href: "/app/judges/list" },
      {
        titleKey: "judges.contentField",
        href: "/app/judges/website-descriptions",
      },
    ],
  },
  { titleKey: "news", icon: Newspaper, href: "/app/news" },
  { titleKey: "press", icon: Megaphone, href: "/app/press" },
  {
    titleKey: "staticPages.root",
    icon: FileText,
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
  { titleKey: "shop", icon: ShoppingBag, href: "/app/shop" },
  {
    titleKey: "ticketsAndPackages",
    icon: Ticket,
    href: "/app/tickets-and-packages",
  },
  { titleKey: "profile", icon: UserCircle, href: "/app/profile" },
  { titleKey: "logout", icon: LogOut, action: "logout" },
] satisfies NavItem[];

export const menuConfig = NAV_ITEMS;
export const MenuConfig = () => NAV_ITEMS;
