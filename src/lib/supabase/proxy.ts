import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "@/src/lib/utils";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";
import { hasLocale, Locale } from "next-intl";

const guestOnlyRoutes = ["/"];
const protectedRoutes = ["/app"];
const COOKIE_LOCALE_KEY = "NEXT_LOCALE";

function getPathInfo(pathname: string, fallbackLocale: Locale) {
  const [, maybeLocale, ...segments] = pathname.split("/");

  const isMatchedLocale = hasLocale(routing.locales, maybeLocale);

  const locale = isMatchedLocale ? maybeLocale : fallbackLocale;
  const pathnameWithoutLocale = isMatchedLocale
    ? `/${segments.join("/")}`
    : pathname;

  return {
    locale,
    pathnameWithoutLocale:
      pathnameWithoutLocale === "/"
        ? "/"
        : pathnameWithoutLocale.replace(/\/$/, ""),
  };
}

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (protectedRoute) =>
      pathname === protectedRoute || pathname.startsWith(`${protectedRoute}/`),
  );
}

export async function updateSession(request: NextRequest) {
  const requestedLocale = request.cookies.get(COOKIE_LOCALE_KEY);
  const defaultLocale = hasLocale(routing.locales, requestedLocale?.value)
    ? requestedLocale.value
    : routing.defaultLocale;

  const handleI18nRouting = createMiddleware({
    locales: routing.locales,
    defaultLocale,
  });

  let supabaseResponse = handleI18nRouting(request);

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = handleI18nRouting(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  console.log("user", user);
  const { locale, pathnameWithoutLocale } = getPathInfo(
    request.nextUrl.pathname,
    defaultLocale ?? routing.defaultLocale,
  );

  // Redirect unauthenticated users to the login page
  // when attempting to access protected routes.
  if (isProtectedRoute(pathnameWithoutLocale) && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    const redirectResponse = NextResponse.redirect(url);
    return redirectResponse;
  }

  // Prevent authenticated users from accessing authentication pages
  // (e.g. /auth/login, /auth/sign-up).
  // If the user is already signed in, redirect them to the protected area.
  if (user && pathnameWithoutLocale.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/app`;
    const redirectResponse = NextResponse.redirect(url);
    return redirectResponse;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
