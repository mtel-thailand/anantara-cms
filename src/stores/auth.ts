import { create } from "zustand";
import type { MenuTranslationKey } from "@/src/constants/nav-config";
import { JwtPayload } from "@supabase/supabase-js";

type ExpandedMenuKeys = Partial<Record<MenuTranslationKey, boolean>>;

type AuthStore = {
  user: JwtPayload | null;
  setUser: (user: JwtPayload) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set(() => ({ user: user })),
}));

export const selectUser = (state: AuthStore) => state.user;

export const selectSetUser = (state: AuthStore) => state.setUser;
