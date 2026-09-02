import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  contentFieldAdminRowsSchema,
  contentFieldPageSchema,
  contentFieldSnapshotSchema,
  type PublishContentFieldInput,
} from "./content-field.schema";
import {
  getContentFieldDefinitions,
  getRequiredContentFieldVariants,
} from "./content-field.config";
import type {
  ContentFieldData,
  ContentFieldDraft,
  ContentFieldPageKey,
} from "./content-field.types";
import type { Database } from "@/src/types/database.types";

type ContentRpcResult = { data: unknown; error: PostgrestError | null };

type ContentPageQuery = {
  select(columns: "key, version"): {
    eq(
      column: "key",
      value: ContentFieldPageKey,
    ): {
      maybeSingle(): Promise<ContentRpcResult>;
    };
  };
};

type ContentRpcClient = {
  from(table: "content_pages"): ContentPageQuery;
  rpc(
    functionName: "get_content_page_admin",
    args: { p_page_key: ContentFieldPageKey },
  ): Promise<ContentRpcResult>;
  rpc(
    functionName: "publish_content_page",
    args: {
      p_page_key: ContentFieldPageKey;
      p_values: unknown[];
    },
  ): Promise<ContentRpcResult>;
};

function contentRpc(supabase: SupabaseClient<Database>): ContentRpcClient {
  // The documented content schema is not yet represented in generated database
  // types. This narrow boundary keeps its RPC responses untrusted until Zod
  // validates them below.
  return supabase as unknown as ContentRpcClient;
}

function emptyFieldData(variants: readonly string[]): ContentFieldData[string] {
  return {
    ...(variants.some((variant) => variant.startsWith("web:"))
      ? { desktop: { en: "", it: "" } }
      : {}),
    ...(variants.some((variant) => variant === "app:en")
      ? { app: { en: "" } }
      : {}),
    ...(variants.some((variant) => variant === "shared:und")
      ? { shared: { und: "" } }
      : {}),
  };
}

function contentFromValue(value: { content: string } | { text: string }) {
  return "content" in value ? value.content : value.text;
}

function emptyData(pageKey: ContentFieldPageKey): ContentFieldData {
  return Object.fromEntries(
    getContentFieldDefinitions(pageKey).map((field) => [
      field.key,
      emptyFieldData(field.variants),
    ]),
  );
}

function mapSnapshot(snapshot: unknown): ContentFieldDraft {
  const parsed = contentFieldSnapshotSchema.parse(snapshot);
  const definitions = getContentFieldDefinitions(parsed.pageKey);
  const variants = new Map(
    parsed.values.map((variant) => [
      `${variant.fieldKey}:${variant.channel}:${variant.locale}`,
      contentFromValue(variant.value),
    ]),
  );

  const supportedVariants = definitions.flatMap((field) =>
    field.variants.map((variant) => `${field.key}:${variant}`),
  );
  const requiredVariants = getRequiredContentFieldVariants(parsed.pageKey).map(
    ({ fieldKey, variant }) => `${fieldKey}:${variant}`,
  );
  if (
    variants.size !== parsed.values.length ||
    parsed.values.some(
      (variant) =>
        !supportedVariants.includes(
          `${variant.fieldKey}:${variant.channel}:${variant.locale}`,
        ),
    ) ||
    requiredVariants.some((variant) => !variants.has(variant))
  ) {
    throw new Error("Content page has unsupported or missing variants.");
  }

  return {
    pageKey: parsed.pageKey,
    version: parsed.version,
    data: Object.fromEntries(
      definitions.map((field) => [
        field.key,
        {
          ...(field.variants.some((variant) => variant.startsWith("web:"))
            ? {
                desktop: {
                  en: variants.get(`${field.key}:web:en`) ?? "",
                  it: variants.get(`${field.key}:web:it`) ?? "",
                },
              }
            : {}),
          ...(field.variants.some((variant) => variant === "app:en")
            ? { app: { en: variants.get(`${field.key}:app:en`) ?? "" } }
            : {}),
          ...(field.variants.some((variant) => variant === "shared:und")
            ? {
                shared: {
                  und: variants.get(`${field.key}:shared:und`) ?? "",
                },
              }
            : {}),
        },
      ]),
    ),
  };
}

function toPublishValues(pageKey: ContentFieldPageKey, data: ContentFieldData) {
  const definitions = getContentFieldDefinitions(pageKey);
  const expectedKeys = new Set(definitions.map((field) => field.key));
  const actualKeys = Object.keys(data);

  if (
    actualKeys.length !== expectedKeys.size ||
    actualKeys.some((key) => !expectedKeys.has(key))
  ) {
    throw new Error("Content page has unsupported fields.");
  }

  return definitions.flatMap((field) => {
    const fieldData = data[field.key];
    if (!fieldData)
      throw new Error(`Content field \"${field.key}\" is missing.`);

    return field.variants.map((variant) => {
      const [channel, locale] = variant.split(":") as [
        "web" | "app" | "shared",
        "en" | "it" | "und",
      ];
      const content =
        channel === "web"
          ? fieldData.desktop?.[locale as "en" | "it"]
          : channel === "app"
            ? fieldData.app?.en
            : fieldData.shared?.und;
      if (content === undefined) {
        throw new Error(
          `Content field \"${field.key}\" is missing ${variant}.`,
        );
      }

      return {
        fieldKey: field.key,
        locale,
        channel,
        value: content.trim()
          ? field.contentType === "plain_text"
            ? { text: content }
            : { format: "html", content }
          : null,
      };
    });
  });
}

function emptyDraft(
  pageKey: ContentFieldPageKey,
  version: number,
): ContentFieldDraft {
  return {
    pageKey,
    version,
    data: emptyData(pageKey),
  };
}

function mapAdminRows(rows: unknown): ContentFieldDraft {
  const parsed = contentFieldAdminRowsSchema.parse(rows);
  const first = parsed[0];
  if (!first) {
    throw new Error("Content page does not exist.");
  }

  const variants = new Map(
    parsed.flatMap((row) =>
      row.channel && row.locale && row.field_value
        ? [
            [
              `${row.field_key}:${row.channel}:${row.locale}`,
              contentFromValue(row.field_value),
            ] as const,
          ]
        : [],
    ),
  );

  return {
    pageKey: first.page_key,
    version: first.page_version,
    data: Object.fromEntries(
      getContentFieldDefinitions(first.page_key).map((field) => [
        field.key,
        {
          ...(field.variants.some((variant) => variant.startsWith("web:"))
            ? {
                desktop: {
                  en: variants.get(`${field.key}:web:en`) ?? "",
                  it: variants.get(`${field.key}:web:it`) ?? "",
                },
              }
            : {}),
          ...(field.variants.some((variant) => variant === "app:en")
            ? { app: { en: variants.get(`${field.key}:app:en`) ?? "" } }
            : {}),
          ...(field.variants.some((variant) => variant === "shared:und")
            ? {
                shared: {
                  und: variants.get(`${field.key}:shared:und`) ?? "",
                },
              }
            : {}),
        },
      ]),
    ),
  };
}

export async function getContentFieldDraft(
  supabase: SupabaseClient<Database>,
  pageKey: ContentFieldPageKey,
): Promise<ContentFieldDraft> {
  const { data, error } = await contentRpc(supabase).rpc(
    "get_content_page_admin",
    { p_page_key: pageKey },
  );
  if (error) throw error;

  if (Array.isArray(data) && data.length > 0) {
    return mapAdminRows(data);
  }

  const pageResult = await contentRpc(supabase)
    .from("content_pages")
    .select("key, version")
    .eq("key", pageKey)
    .maybeSingle();

  if (pageResult.error) throw pageResult.error;
  return emptyDraft(
    contentFieldPageSchema.parse(pageResult.data).key,
    contentFieldPageSchema.parse(pageResult.data).version,
  );
}

export async function publishContentField(
  supabase: SupabaseClient<Database>,
  input: PublishContentFieldInput,
): Promise<ContentFieldDraft> {
  const { data, error } = await contentRpc(supabase).rpc(
    "publish_content_page",
    {
      p_page_key: input.pageKey,
      p_values: toPublishValues(input.pageKey, input.data),
    },
  );
  if (error) throw error;
  return mapSnapshot(data);
}
