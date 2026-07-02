import { NextRequest } from "next/server";
import { ApiContext, ApiHandler } from "./types";
import { logger } from "@/src/lib/logger";

function getRequestMeta(request: NextRequest) {
  const url = new URL(request.url);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return {
    method: request.method,
    path: url.pathname,
    query: url.search,
    ip,
    userAgent,
  };
}

export function logHandler(request: NextRequest, logType?: string) {
  const { method, path, query, ip, userAgent } = getRequestMeta(request);

  logger.info(logType ?? "API", "request received", {
    method,
    path: `${path}${query}`,
    ip,
    userAgent,
  });
}

export function withApiLogger<TContext extends ApiContext>(
  handler: ApiHandler<TContext>,
): ApiHandler<TContext> {
  return async function requestLogHandler(req, ctx) {
    const start = performance.now();
    const { method, path, query, ip, userAgent } = getRequestMeta(req);

    try {
      const response = await handler(req, {
        ...ctx,
      });
      const durationMs = Math.round(performance.now() - start);

      logger.debug("API", "request completed", {
        method,
        path: `${path}${query}`,
        status: response.status,
        duration: `${durationMs}ms`,
        ip,
        userAgent,
      });

      return response;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);

      logger.error("API", "request failed", {
        method,
        path: `${path}${query}`,
        duration: `${durationMs}ms`,
        ip,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}
