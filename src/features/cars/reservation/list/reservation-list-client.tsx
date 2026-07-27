"use client";

import { useRouter } from "@/src/i18n/navigation";
import { useOwnerReservationList } from "./hooks/use-owner-reservation-list";

export function ReservationFormListClient() {
  const router = useRouter();
  const {
    data,
    total,
    page,
    isLoading,
    setPage,
    setQuery,
    setSort,
    setFilters,
    refresh,
  } = useOwnerReservationList({
    pageSize: 10,
    filters: { status: null, hasDeletedAt: false },
  });

  return <div></div>;
}
