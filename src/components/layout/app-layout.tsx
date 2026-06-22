"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import Topbar from "./topbar";
import Sidebar from "./sidebar";
import { JwtHeader, JwtPayload } from "@supabase/supabase-js";
import { selectSetUser, selectUser, useAuthStore } from "@/src/stores/auth";
import { menuConfig } from "@/src/constants/nav-config";

type AppLayoutContextType = {};

const AppLayoutContext = createContext<AppLayoutContextType | undefined>(
  undefined,
);

export default function AppLayoutProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: JwtPayload | null;
}) {
  const headerRef = useRef<HTMLInputElement>(null);
  const userState = useAuthStore(selectUser);
  const setUser = useAuthStore(selectSetUser);

  useEffect(() => {
    user && setUser(user);
  }, [user, setUser]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-row">
      <Sidebar menu={menuConfig} />
      <div className="w-full flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 px-10 py-9 overflow-auto" style={{}}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function useLayoutContext() {
  const context = useContext(AppLayoutContext);
  if (context === undefined) {
    throw new Error("useCookieContext must be used within a CookieProvider");
  }
  return context;
}
