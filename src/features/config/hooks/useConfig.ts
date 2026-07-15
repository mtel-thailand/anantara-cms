import { getAppConfig } from "@/src/features/config/config.service";
import { AppConfig, ConfigStateRow } from "@/src/features/config/config.type";
import { useEffect, useState } from "react";
import { switchFeatureFlag } from "@/src/features/config/config.service";

export default function useConfig() {
  const [configStore, setConfigStore] = useState<ConfigStateRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const config = await getAppConfig();
        setConfigStore(config);
      } catch (error) {
        console.log("get config error", error);
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
