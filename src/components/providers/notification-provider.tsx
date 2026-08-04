"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useUnseenSubmissionCount } from "@/src/features/cars/submission/hooks/use-unseen-submission-count";
import { useUnseenReservationFormCount } from "@/src/features/cars/reservation/list/hooks/use-unseen-reservation-form-count";

type NotificationContextValue = {
  reservationSeenCount: number;
  submissionSeenCount: number;
  reservationTrigger: number;
  submissionTrigger: number;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { submissionSeenCount, submissionTrigger } = useUnseenSubmissionCount();
  const { reservationSeenCount, reservationTrigger } =
    useUnseenReservationFormCount();
  const value = useMemo(
    () => ({
      reservationSeenCount,
      reservationTrigger,
      submissionSeenCount,
      submissionTrigger,
    }),
    [
      reservationSeenCount,
      reservationTrigger,
      submissionSeenCount,
      submissionTrigger,
    ],
  );
  console.log("reservationSeenCount", reservationSeenCount);
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
