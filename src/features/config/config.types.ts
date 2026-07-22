import type { CamelCasedPropertiesDeep, Override } from "@/src/types/common";
import type { Database } from "@/src/types/database.types";

export type ConfigRow = Database["public"]["Tables"]["config"]["Row"];

export type ConfigStateRow = Override<
  CamelCasedPropertiesDeep<ConfigRow>,
  { config: AppConfig }
>;

export interface AppConfig {
  map: MapConfig;
  version: VersionConfig;
  appFlags: AppFlags;
  featureFlags: FeatureFlags;
  appStore: AppStoreConfig;
  buyTicket: BuyTicketConfig;
  eventFlag: EventFlagConfig;
  newsletter: NewsletterConfig;
  stayInLoop: StayInLoopConfig;
  syncOption: SyncOptionConfig;
  appCosmetic: AppCosmeticConfig;
  judgeAmount: number;
  syncNotification: SyncNotificationConfig;
}

export type EventFlagValue =
  | "auto"
  | "before_the_event"
  | "during_the_event"
  | "after_the_event";

export type SyncOptionValue =
  | "today"
  | "yesterday"
  | "2_days_ago"
  | "all"
  | `${number}-${number}-${number}`;

export type YesNo = "yes" | "no";

export interface MapConfig {
  url: string;
  width: number;
  height: number;
  maximumZoomIn: number;
}

export interface VersionConfig {
  iOSMinVersion: string;
  androidMinVersion: string;
}

export interface AppFlags {
  tabMap: boolean;
  tabAgenda: boolean;
  tabAwards: boolean;
  tabJudges: boolean;
  drawerNews: boolean;
  tabCarList: boolean;
  drawerPress: boolean;
  drawerCharity: boolean;
  drawerContact: boolean;
  drawerPartners: boolean;
  homeAwardBanner: boolean;
  drawerBuyTickets: boolean;
  drawerStayInLoop: boolean;
  drawerUsefulInfo: boolean;
  drawerLegalNotice: boolean;
  drawerNotifications: boolean;
  drawerPrivacyPolicy: boolean;
  drawerUsefulInfoWhatToWear: boolean;
  drawerUsefulInfoAboutAnantara: boolean;
  drawerUsefulInfoHowToGetThere: boolean;
  drawerUsefulInfoCasinaValadier: boolean;
}

export interface FeatureFlags {
  carSubmission: boolean;
}

export interface AppStoreConfig {
  iOS: string;
  android: string;
}

export interface BuyTicketConfig {
  href: string;
  enable: boolean;
}

export interface EventFlagConfig {
  value: EventFlagValue;
  endedAt: string;
  fakeToday: string | null;
  startedAt: string;
  description: string;
  betweenEventAt: string[];
  winnerAnnouncedAt: string;
}

export interface NewsletterConfig {
  timestamp: string;
}

export interface StayInLoopConfig {
  href: string;
}

export interface SyncOptionConfig {
  value: SyncOptionValue;
  description: string;
}

export interface AppCosmeticConfig {
  homePageImage: string;
  newsletterLink: string;
  bestOfShowImageUrl: string;
  bestInClassImageUrl: string;
  ticketPackageWebUrl: string;
  peopleChoiceImageUrl: string | null;
  winnerBannerImageUrl: string;
  specialAwardsImageUrl: string;
  anantaraWinnerCategoryLogo: string;
}

export interface SyncNotificationConfig {
  value: YesNo;
  description: string;
}
