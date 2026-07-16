import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { getConfigurationHealth } from "@/src/lib/health/config";
import { NextResponse } from "next/server";

function healthHandler() {
  return NextResponse.json(
    {
      ...getConfigurationHealth(),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export const GET = withApiLogger(healthHandler);
