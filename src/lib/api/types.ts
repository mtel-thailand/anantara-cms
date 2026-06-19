import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export type RouteParams = Record<string, string | string[]>;

export type ApiContext = {
  params?: Promise<RouteParams>;
  user?: User;
  body?: unknown;
  query?: unknown;
  headers?: unknown;
  files?: File[];
};

export type ApiHandler<TContext extends ApiContext = ApiContext> = (
  req: NextRequest,
  ctx: TContext,
) => Promise<Response> | Response;
