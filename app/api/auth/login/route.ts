import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { ApiContext } from "@/src/lib/api/types";
import { withValidate } from "@/src/lib/api/with-validate";
import { createClient } from "@/src/lib/supabase/server";
import { InferSchemas, SchemaMap } from "@/src/types/api-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = {
  body: z
    .object({
      email: z.email("Please enter a valid email address"),
      password: z.string().min(1, "Password is required"),
    })
    .strict(),
} satisfies SchemaMap;

type PostContextReturnType = ApiContext & InferSchemas<typeof loginSchema>;

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ctx.body.email,
    password: ctx.body.password,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  return NextResponse.json({
    message: "Logged in",
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}

const postWithValidateSchemaHandler = withValidate<
  typeof loginSchema,
  ApiContext
>(loginSchema, postRouteHandler);

export const POST = withApiLogger(postWithValidateSchemaHandler);
