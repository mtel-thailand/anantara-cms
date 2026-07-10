import { updateSession } from "@/src/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { logHandler } from "./src/lib/api/with-api-logger";
import { applyCors } from "./src/lib/api/cors";

export async function proxy(request: NextRequest) {
  logHandler(request, "MIDDLEWARE");
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return applyCors(
        request,
        new NextResponse(null, {
          status: 204,
        }),
      );
    }

    // Continue to the route handler
    return applyCors(request, NextResponse.next());
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/api/public/:path*",
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
