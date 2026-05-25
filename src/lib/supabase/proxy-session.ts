import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes reachable without a session. Everything else requires sign-in. */
const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Runs in the proxy on every request. Two jobs:
 *
 *  1. Refresh the Supabase session and write the rotated auth cookies onto
 *     the response (without this, sessions silently expire).
 *  2. Optimistic authentication gate — bounce signed-out users to /login and
 *     signed-in users away from /login.
 *
 * This is intentionally NOT the authorization layer. Per-page role checks
 * happen in the Data Access Layer (it can render a proper 403), and Postgres
 * RLS is the final gate. The proxy only ever reads the cookie — no DB calls —
 * so it stays fast and cannot itself leak data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not insert logic between client creation and getClaims(): it validates
  // and refreshes the token, and anything in between risks a stale session.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  if (!isSignedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isSignedIn && pathname === "/login") {
    // "/" resolves to the user's role-appropriate landing page.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
