type ConfigDefinition = {
  key: string;
  required: boolean;
};

const CONFIG_GROUPS = {
  application: [
    { key: "REACT_EDITOR", required: false },
    { key: "NEXT_PUBLIC_ANANTARA_CLIENT_BASE_URL", required: true },
    { key: "NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL", required: false },
  ],
  supabase: [
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
    { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", required: true },
  ],
  s3: [
    { key: "S3_REGION", required: true },
    { key: "S3_BUCKET", required: true },
    { key: "S3_ACCESS_KEY", required: false },
    { key: "S3_SECRET_ACCESS_KEY", required: false },
    { key: "S3_CMS_FOLDER", required: true },
    { key: "S3_CLIENT_FOLDER", required: true },
  ],
  ses: [
    { key: "SES_ACCESS_KEY_ID", required: false },
    { key: "SES_SECRET_ACCESS_KEY", required: false },
    { key: "SES_REGION", required: true },
    { key: "SES_FROM", required: true },
    { key: "SES_TO", required: false },
  ],
} satisfies Record<string, readonly ConfigDefinition[]>;

const SENSITIVE_CONFIG_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "S3_ACCESS_KEY",
  "S3_SECRET_ACCESS_KEY",
  "SES_ACCESS_KEY_ID",
  "SES_SECRET_ACCESS_KEY",
]);

function getConfigValue(key: string) {
  const value = process.env[key]?.trim();

  if (!value) return null;
  if (SENSITIVE_CONFIG_KEYS.has(key)) return "[REDACTED]";

  return value;
}

function isConfigured(key: string) {
  return Boolean(process.env[key]?.trim());
}

function credentialMode(accessKey: string, secretKey: string) {
  const hasAccessKey = isConfigured(accessKey);
  const hasSecretKey = isConfigured(secretKey);

  if (hasAccessKey && hasSecretKey) return "explicit" as const;
  if (!hasAccessKey && !hasSecretKey) return "default-provider-chain" as const;
  return "incomplete" as const;
}

export function getConfigurationHealth() {
  const missing: string[] = [];

  const configuration = Object.fromEntries(
    Object.entries(CONFIG_GROUPS).map(([group, definitions]) => [
      group,
      Object.fromEntries(
        definitions.map(({ key, required }) => {
          const configured = isConfigured(key);
          if (required && !configured) missing.push(key);

          return [
            key,
            {
              configured,
              required,
              sensitive: SENSITIVE_CONFIG_KEYS.has(key),
              value: getConfigValue(key),
            },
          ];
        }),
      ),
    ]),
  );

  const credentials = {
    s3: credentialMode("S3_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"),
    ses: credentialMode("SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY"),
  };
  const incompleteCredentials = Object.entries(credentials)
    .filter(([, mode]) => mode === "incomplete")
    .map(([service]) => service);

  return {
    status:
      missing.length || incompleteCredentials.length ? "degraded" : "ok",
    environment: process.env.NODE_ENV ?? "unknown",
    configuration,
    credentials,
    missing,
    incompleteCredentials,
  };
}
