import type { Database } from "@/src/types/database.types";

export type CarEntryFormRow = Database["public"]["Tables"]["car_entry_forms"]["Row"];
export type CarEntryFormTechnicianRow = Database["public"]["Tables"]["car_entry_form_technicians"]["Row"];

export type CarEntryFormReviewDetail = {
  form: CarEntryFormRow;
  technicians: CarEntryFormTechnicianRow[];
};

export type CarFormsReviewShell = {
  form: Pick<CarEntryFormRow, "status" | "updated_at">;
  ownerReservationId: string | null;
  vehicle: {
    createdAt: string;
    deletedAt: string | null;
    make: string;
    model: string;
    updatedAt: string;
    vehicleRef: string;
  };
};
