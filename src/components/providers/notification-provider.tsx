"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useUnseenSubmissionCount } from "@/src/features/cars/submission/hooks/use-unseen-submission-count";

type NotificationContextValue = {
  submissionCount: number;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const submissionCount = useUnseenSubmissionCount();
  const value = useMemo(() => ({ submissionCount }), [submissionCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider",
    );
  }

  return context;
}
