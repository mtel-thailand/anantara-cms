import {
  getAppConfig,
  switchFeatureFlag,
} from "@/src/features/config/api/config.service";
import type {
  AppConfig,
  ConfigStateRow,
} from "@/src/features/config/config.types";
import { logger } from "@/src/lib/logger";
import { useEffect, useState } from "react";

export default function useConfig() {
  const [configStore, setConfigStore] = useState<ConfigStateRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const config = await getAppConfig();
        setConfigStore(config);
      } catch (error) {
        logger.error("config", "Failed to load application config", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  async function switchFeatureFlagConfig<
    T extends keyof AppConfig["featureFlags"],
  >(key: T, open: boolean) {
    const config = await switchFeatureFlag(key, open);
    setConfigStore(config);
  }

  return { configStore, switchFeatureFlagConfig };
}
