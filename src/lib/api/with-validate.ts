import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ApiContext, ApiHandler } from "./types";
import type { InferSchemas, SchemaMap } from "@/src/types/common";

export function withValidate<
  TSchemas extends SchemaMap,
  TContext extends ApiContext,
>(
  schemas: TSchemas,
  handler: ApiHandler<TContext & InferSchemas<TSchemas>>,
): ApiHandler<TContext> {
  return async function validateHandler(req: NextRequest, ctx: TContext) {
    try {
      const url = new URL(req.url);

      const rawBody = schemas.body ? await req.json() : undefined;
      const rawQuery = Object.fromEntries(url.searchParams.entries());
      const rawHeaders = Object.fromEntries(req.headers.entries());

      const parsed = {
        body: schemas.body ? schemas.body.parse(rawBody) : undefined,
        query: schemas.query ? schemas.query.parse(rawQuery) : undefined,
        headers: schemas.headers
          ? schemas.headers?.parse(rawHeaders)
          : undefined,
      };

      return handler(req, {
        ...parsed,
        ...ctx,
      } as TContext & InferSchemas<TSchemas>);
    } catch (error) {
      console.log("[ERROR] ", error);
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            message: "Schema validation failed",
            errors: error.flatten(),
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }
  };
}
