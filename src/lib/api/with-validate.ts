import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ApiContext, ApiHandler } from "./types";
import type { InferSchemas, SchemaMap } from "@/src/types/api-schema";
import { logger } from "../logger";

export function withValidate<
  TSchemas extends SchemaMap,
  TContext extends ApiContext,
>(
  schemas: TSchemas,
  handler: ApiHandler<TContext & InferSchemas<TSchemas>>,
  formDataKey?: string,
): ApiHandler<TContext> {
  return async function validateHandler(req: NextRequest, ctx: TContext) {
    try {
      const url = new URL(req.url);

      const rawBody = schemas.body ? await req.json() : undefined;
      const rawQuery = Object.fromEntries(url.searchParams.entries());
      const rawHeaders = Object.fromEntries(req.headers.entries());
      const rawFormData = schemas.files ? await req.formData() : undefined;

      const parsed = {
        body: schemas.body ? schemas.body.parse(rawBody) : undefined,
        query: schemas.query ? schemas.query.parse(rawQuery) : undefined,
        headers: schemas.headers
          ? schemas.headers?.parse(rawHeaders)
          : undefined,
        files: schemas.files
          ? schemas.files.parse(rawFormData?.getAll(formDataKey ?? "files"))
          : undefined,
      };

      return handler(req, {
        ...parsed,
        ...ctx,
      } as TContext & InferSchemas<TSchemas>);
    } catch (error) {
      const url = new URL(req.url);

      if (error instanceof z.ZodError) {
        logger.warn("VALIDATION", "schema validation failed", {
          method: req.method,
          path: url.pathname,
          issues: error.issues,
        });

        return NextResponse.json(
          {
            message: "Schema validation failed",
            errors: error.flatten(),
          },
          { status: 400 },
        );
      }

      logger.error("VALIDATION", "request validation failed", {
        method: req.method,
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }
  };
}
