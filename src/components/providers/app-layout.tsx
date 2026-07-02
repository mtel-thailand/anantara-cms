"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Topbar from "@/src/components/layout/topbar";
import Sidebar from "@/src/components/layout/sidebar";
import { JwtPayload } from "@supabase/supabase-js";
import { selectSetUser, useAuthStore } from "@/src/stores/auth";
import { menuConfig } from "@/src/constants/nav-config";
import OverlayPage from "@/src/components/layout/overlay-page";

export type OverlayElementType = {
  header?: ReactNode | null;
  content?: ReactNode | null;
  footer?: ReactNode | null;
};

type AppLayoutContextType = {
  isOpenOverlay: boolean;
  handleOpenOverlay: () => void;
  handleCloseOverlay: () => void;
  setOverlayPage: (value: OverlayElementType) => void;
};

const AppLayoutContext = createContext<AppLayoutContextType | undefined>(
  undefined,
);

const overlayElementValue: OverlayElementType = {
  header: null,
  content: null,
  footer: null,
};

export default function AppLayoutProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: JwtPayload | null;
}) {
  const [overlayElement, setOverlayElement] =
    useState<OverlayElementType>(overlayElementValue);
  const [openOverlay, setOpenOverlay] = useState<boolean>(false);
  const setUser = useAuthStore(selectSetUser);

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  function handleOpenOverlay() {
    setOpenOverlay(true);
  }

  function handleCloseOverlay() {
    setOpenOverlay(false);
  }

  function setOverlayPage(value: OverlayElementType) {
    setOverlayElement(value);
  }

  return (
    <AppLayoutContext.Provider
      value={{
        isOpenOverlay: openOverlay,
        handleOpenOverlay,
        handleCloseOverlay,
        setOverlayPage,
      }}
    >
      <div className="w-screen h-screen flex flex-row">
        <Sidebar menu={menuConfig} />
        <main className="min-w-0 min-h-0 flex flex-1 flex-col overflow-y-auto overscroll-contain">
          <Topbar />
          <div className="mx-auto max-w-6xl w-full px-10 py-9 content-animate-in">
            {children}
          </div>
        </main>
      </div>
      <OverlayPage
        open={openOverlay}
        setOpen={setOpenOverlay}
        overlayElement={overlayElement}
      />
    </AppLayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(AppLayoutContext);
  if (context === undefined) {
    throw new Error("useLayoutContext must be used within a AppLayoutProvider");
  }
  return context;
}
