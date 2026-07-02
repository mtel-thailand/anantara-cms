export type SupabaseResponse<T> = {
  success: boolean;
  error: unknown | null;
  data: T;
  count: number | null;
  status: number;
  statusText: string;
};
