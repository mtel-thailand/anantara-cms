import type { Database } from "@/src/types/database.types";

export type CarEntryFormRow = Database["public"]["Tables"]["car_entry_forms"]["Row"];
export type CarEntryFormTechnicianRow = Database["public"]["Tables"]["car_entry_form_technicians"]["Row"];

export type CarEntryFormReviewDetail = {
  form: CarEntryFormRow;
  technicians: CarEntryFormTechnicianRow[];
  vehicle: Pick<
    Database["public"]["Tables"]["car_submission_vehicles"]["Row"],
    | "body_style"
    | "chassis_no"
    | "coachbuilder"
    | "engine_no"
    | "exterior_colour"
    | "interior_colour"
    | "make_of_vehicle"
    | "model"
    | "vehicle_history_en"
    | "year_of_manufacture"
  >;
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
