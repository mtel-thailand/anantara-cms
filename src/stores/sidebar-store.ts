import { create } from "zustand";
import type { MenuTranslationKey } from "@/src/constants/nav-config";
import { persist, createJSONStorage } from "zustand/middleware";

type ExpandedMenuKeys = Partial<Record<MenuTranslationKey, boolean>>;

type SidebarStore = {
  width: number;
  setSidebarWidth: (width: number) => void;
  expandedMenuKeys: ExpandedMenuKeys;
  setMenuExpanded: (key: MenuTranslationKey, isExpanded: boolean) => void;
  toggleMenuExpanded: (key: MenuTranslationKey) => void;
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      width: 250,
      setSidebarWidth: (widthLength: number) =>
        set((state) => ({ ...state, width: widthLength })),
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
    }),
    { name: "sidebar-menu", storage: createJSONStorage(() => localStorage) },
  ),
);

export const selectWidth = (state: SidebarStore) => state.width;

export const selectSetSidebarWidth = (state: SidebarStore) =>
  state.setSidebarWidth;

export const selectIsMenuExpanded =
  (key: MenuTranslationKey) => (state: SidebarStore) =>
    Boolean(state.expandedMenuKeys[key]);

export const selectSetMenuExpanded = (state: SidebarStore) =>
  state.setMenuExpanded;

export const selectToggleMenuExpanded = (state: SidebarStore) =>
  state.toggleMenuExpanded;
