import { create } from "zustand";
import type { MenuTranslationKey } from "@/src/constants/nav-config";

type ExpandedMenuKeys = Partial<Record<MenuTranslationKey, boolean>>;

type SidebarStore = {
  expandedMenuKeys: ExpandedMenuKeys;
  setMenuExpanded: (key: MenuTranslationKey, isExpanded: boolean) => void;
  toggleMenuExpanded: (key: MenuTranslationKey) => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  expandedMenuKeys: {},
  setMenuExpanded: (key, isExpanded) =>
    set((state) => ({
      expandedMenuKeys: {
        ...state.expandedMenuKeys,
        [key]: isExpanded,
      },
    })),
  toggleMenuExpanded: (key) =>
    set((state) => ({
      expandedMenuKeys: {
        ...state.expandedMenuKeys,
        [key]: !state.expandedMenuKeys[key],
      },
    })),
}));

export const selectIsMenuExpanded =
  (key: MenuTranslationKey) => (state: SidebarStore) =>
    Boolean(state.expandedMenuKeys[key]);

export const selectSetMenuExpanded = (state: SidebarStore) =>
  state.setMenuExpanded;

export const selectToggleMenuExpanded = (state: SidebarStore) =>
  state.toggleMenuExpanded;
