import { createClient } from "@/src/lib/supabase/client";
import { unwrap } from "@/src/lib/supabase/unwrap";
import { AppConfig, ConfigRow, ConfigStateRow } from "./config.type";
import type { Json } from "@/src/types/database.types";

function toConfigStateRow(row: ConfigRow): ConfigStateRow {
  return {
    config: row.config as unknown as AppConfig,
    createdAt: row.created_at,
    id: row.id,
    isActive: row.is_active,
  };
}

export const getAppConfig = async (): Promise<ConfigStateRow | null> => {
  const supabase = createClient();

  const { data, error } = await supabase.from("config").select("*").single();

  return toConfigStateRow(unwrap(data, error));
};

export const switchFeatureFlag = async <
  T extends keyof AppConfig["featureFlags"],
>(
  key: T,
  open: boolean,
): Promise<ConfigStateRow> => {
  const supabase = createClient();

  const currentConfig = await getAppConfig();
  if (!currentConfig) throw new Error("Supabase returned null data.");

  const newConfig: AppConfig = {
    ...currentConfig.config,
    featureFlags: {
      ...currentConfig.config.featureFlags,
      [key]: open,
    },
  };

  const { data, error } = await supabase
    .from("config")
    .update({
      config: newConfig as unknown as Json,
    })
    .eq("id", currentConfig.id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Config was not found or could not be changed.");

  return toConfigStateRow(data);
};
