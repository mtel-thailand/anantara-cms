import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { ApiContext, ApiHandler } from "./types";
import { createClient } from "../supabase/server";

type AuthContext = {
  user: User;
};

export function withAuth<TContext extends ApiContext>(
  handler: ApiHandler<TContext & AuthContext>,
): ApiHandler<TContext> {
  return async function authHandler(req, ctx) {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return handler(req, {
      ...ctx,
      user,
    });
  };
}
