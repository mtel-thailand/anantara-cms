import { updateSession } from "@/src/lib/supabase/proxy";
import { type NextRequest } from "next/server";
import { logHandler } from "./src/lib/api/with-api-logger";

export async function proxy(request: NextRequest) {
  logHandler(request, "MIDDLEWARE");
  return await updateSession(request);
}

export const config = {
  matcher: [
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
