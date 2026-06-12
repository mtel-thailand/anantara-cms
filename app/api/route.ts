import { ApiContext } from "@/src/lib/api/types";
import { withAuth } from "@/src/lib/api/with-auth";
import { withValidate } from "@/src/lib/api/with-validate";
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
  console.log("ctx", ctx.query.preview);
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());
  return Response.json({ message: "eiei", test: query });
}

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  console.log("ctx", ctx.body.id, ctx.body.title);
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());
  return Response.json({ message: "eiei", test: query });
}

const authWithValidateSchemaHandler = withAuth(
  withValidate<typeof schemas, ApiContext>(schemas, routeHandler),
);

const postAuthWithValidateSchemaHandler = withAuth(
  withValidate<typeof postSchemas, ApiContext>(postSchemas, postRouteHandler),
);

export const GET = authWithValidateSchemaHandler;

export const POST = postAuthWithValidateSchemaHandler;
