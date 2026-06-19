import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { ApiContext } from "@/src/lib/api/types";
import { withAuth } from "@/src/lib/api/with-auth";
import { withValidate } from "@/src/lib/api/with-validate";
import { logger } from "@/src/lib/logger";
import { InferSchemas, SchemaMap } from "@/src/types/common";
import { NextRequest } from "next/server";
import { z } from "zod";

const schemas = {
  query: z
    .object({
      preview: z.enum(["true", "false"]).transform((value) => value === "true"),
    })
    .strict(),
  //   headers: z.object({
  //     "time-zone": z.string(),
  //   }),
} satisfies SchemaMap;

type ContextReturnType = ApiContext & InferSchemas<typeof schemas>;

const postSchemas = {
  body: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .strict(),
  headers: z.object({
    "time-zone": z.string(),
  }),
  query: z.object({}).strict(),
} satisfies SchemaMap;

type PostContextReturnType = ApiContext & InferSchemas<typeof postSchemas>;

async function routeHandler(request: NextRequest, ctx: ContextReturnType) {
  logger.debug("API", "GET context parsed", { preview: ctx.query.preview });
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());
  return Response.json({ message: "eiei", test: query });
}

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  logger.debug("API", "POST context parsed", {
    id: ctx.body.id,
    title: ctx.body.title,
  });
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());
  return Response.json({ message: "eiei", test: query });
}

const getAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof schemas, ApiContext>(schemas, routeHandler),
);

const postAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof postSchemas, ApiContext>(postSchemas, postRouteHandler),
);

export const GET = withApiLogger(getAuthWithValidateSchemaHandler);

export const POST = withApiLogger(postAuthWithValidateSchemaHandler);
