import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";
import { DEFAULT_EXCLUDED_SUBMISSION_STATUSES } from "@/src/features/cars/submission/submission-types";
import type {
  CarSubmission,
  DbSubmissionStatus,
  SubmissionClass,
  SubmissionVehicleWithFormRow,
  SubmissionVehicleWithFormState,
} from "@/src/features/cars/submission/submission-types";
import {
  toCarSubmission,
  toCarSubmissionListItem,
} from "@/src/features/cars/submission/api/submission.serializer";
import type { StorageFile } from "@/src/lib/s3/client";
import { UploadResponseSchema } from "@/src/schema/storage-file.schema";
import {
  submissionUploadScope,
  type SubmissionUploadKind,
} from "./submission-upload";
import { encodeStorageScope, type StorageScope } from "@/src/lib/s3/scope";

export type CarSubmissionListSortKey =
  | "owner"
  | "reference"
  | "vehicle"
  | "year"
  | "submitted"
  | "status"
  | "updated";

export type CarSubmissionListParams = {
  page: number;
  pageSize: number;
  query?: string;
  sort?: {
    key: CarSubmissionListSortKey;
    descending: boolean;
  };
  status?: "all" | DbSubmissionStatus;
  excludedStatuses?: DbSubmissionStatus[];
  isArchived?: boolean;
};

export type CarSubmissionListResult = {
  data: SubmissionVehicleWithFormState[];
  total: number;
  counts: { all: number } & Partial<Record<DbSubmissionStatus, number>>;
};

function throwIfError(error: unknown) {
  if (error) throw error;
}

async function uploadSubmissionFileKind(
  files: File[],
  formId: string,
  submissionId: string,
  kind: SubmissionUploadKind,
): Promise<StorageFile[]> {
  if (!files.length) return [];

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const scope = submissionUploadScope(formId, submissionId, kind);
  const query = new URLSearchParams({ scope: encodeStorageScope(scope) });
  const response = await fetch(`/api/file?${query}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const json = await response.json().catch(() => null);

  const parsed = UploadResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("Upload API returned an invalid response.");
  }

  const result = parsed.data;

  if (!response.ok) {
    throw new Error(
      result.message ?? `Upload failed with status ${response.status}`,
    );
  }

  return Array.isArray(result.src) ? result.src : [result.src];
}

async function deleteUploadedFiles(files: StorageFile[], scope: StorageScope) {
  await Promise.allSettled(
    files.map((file) =>
      fetch("/api/file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: file.url, scope }),
      }),
    ),
  );
}

export async function uploadCarSubmissionFiles(
  files: {
    documents: File[];
    images: File[];
  },
  reference: { formId: string; submissionId: string },
) {
  const images = await uploadSubmissionFileKind(
    files.images,
    reference.formId,
    reference.submissionId,
    "images",
  );

  try {
    const documents = await uploadSubmissionFileKind(
      files.documents,
      reference.formId,
      reference.submissionId,
      "documents",
    );

    return {
      documents,
      images,
    };
  } catch (error) {
    await deleteUploadedFiles(
      images,
      submissionUploadScope(reference.formId, reference.submissionId, "images"),
    );
    throw error;
  }
}

function searchKeyword(query: string | undefined) {
  return query?.trim() || null;
}

type RpcCarSubmissionsListResult = {
  data?: unknown;
  total?: unknown;
  counts?: unknown;
};

function rpcResult(value: unknown): RpcCarSubmissionsListResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Car submissions RPC returned an invalid response.");
  }

  return value as RpcCarSubmissionsListResult;
}

function rpcData(value: unknown): SubmissionVehicleWithFormRow[] {
  if (!Array.isArray(value)) return [];
  return value as SubmissionVehicleWithFormRow[];
}

function rpcTotal(value: unknown) {
  return typeof value === "number" ? value : 0;
}

const SUBMISSION_COUNT_KEYS = [
  "pending",
  "under_review",
  "requested_info",
  "info_received",
  "waitlist",
  "rejected",
  "approved",
  "finalized",
  "archived",
] satisfies DbSubmissionStatus[];

function rpcCounts(
  value: unknown,
): { all: number } & Partial<Record<DbSubmissionStatus, number>> {
  const counts: { all: number } & Partial<Record<DbSubmissionStatus, number>> = {
    all: 0,
  };

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return counts;
  }

  const record = value as Record<string, unknown>;
  counts.all = typeof record.all === "number" ? record.all : 0;

  for (const key of SUBMISSION_COUNT_KEYS) {
    const count = record[key];
    if (typeof count === "number") counts[key] = count;
  }

  return counts;
}

export async function getCarSubmissions({
  page,
  pageSize,
  query,
  sort,
  status = "all",
  excludedStatuses = DEFAULT_EXCLUDED_SUBMISSION_STATUSES,
  isArchived = false,
}: CarSubmissionListParams): Promise<CarSubmissionListResult> {
  const supabase = createClient();
  const keyword = searchKeyword(query);
  const effectiveExcludedStatuses =
    status === "all"
      ? excludedStatuses
      : excludedStatuses.filter((excludedStatus) => excludedStatus !== status);
  const { data, error } = await supabase.rpc("get_car_submissions_list", {
    p_page: page,
    p_page_size: pageSize,
    p_query: keyword ?? undefined,
    p_status: status === "all" ? undefined : status,
    p_sort_key: sort?.key ?? "updated",
    p_sort_desc: sort?.descending ?? true,
    p_excluded_statuses: effectiveExcludedStatuses,
    p_is_archived: isArchived,
  });
  const result = rpcResult(unwrap(data, error));
  const vehicles = rpcData(result.data);

  return {
    data: vehicles.map(toCarSubmissionListItem),
    total: rpcTotal(result.total),
    counts: rpcCounts(result.counts),
  };
}

export async function markSeenCarSubmissionVehicle(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("car_submission_vehicles")
    .update({ seen: true })
    .eq("id", id);

  throwIfError(error);
}

export async function getCarSubmissionVehicle(
  id: string,
): Promise<CarSubmission> {
  const supabase = createClient();
  const [{ data, error } /*{ data: car, error: carError }*/] =
    await Promise.all([
      supabase
        .from("car_submission_vehicles")
        .select(
          `
        *,
        car_submissions_form!inner (*)
      `,
        )
        .eq("id", id)
        .maybeSingle(),
      // supabase
      //   .from("cars")
      //   .select("category_id")
      //   .eq("submission_vehicle_id", id)
      //   .limit(1)
      //   .maybeSingle(),
    ]);

  const vehicle: SubmissionVehicleWithFormRow | null = unwrap(data, error);
  // throwIfError(carError);
  if (!vehicle) {
    throw new Error("Car submission vehicle was not found.");
  }

  return toCarSubmission(vehicle.car_submissions_form, vehicle /*, car*/);
}

export async function getCarSubmissionClasses(): Promise<SubmissionClass[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("car_categories")
    .select("id, name, seq")
    .eq("enable", true)
    .order("seq", { ascending: true });

  return unwrap(data, error);
}
