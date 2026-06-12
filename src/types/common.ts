import { z } from "zod";

export type SchemaMap = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  headers?: z.ZodTypeAny;
};

type InferSchema<TSchema> = TSchema extends z.ZodTypeAny
  ? z.infer<TSchema>
  : undefined;

export type InferSchemas<TSchemas extends SchemaMap> = {
  body: InferSchema<TSchemas["body"]>;
  query: InferSchema<TSchemas["query"]>;
  headers: InferSchema<TSchemas["headers"]>;
};
