import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GONE_PATHS = new Set(["/tr-gret", "/shop-1", "/shop-2"]);

const isProtectedRoute = createRouteMatcher([
  "/checkout",
  "/orders",
  "/orders/[id]",
  "/checkout/success",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)", "/dashboard(.*)"]);
const isSeoRefreshRoute = createRouteMatcher(["/api/admin/seo/refresh"]);
const isWelcomeBackRoute = createRouteMatcher(["/welcome-back"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (GONE_PATHS.has(req.nextUrl.pathname)) {
    return new Response("Gone", {
      status: 410,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (isSeoRefreshRoute(req)) {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = req.headers.get("authorization");
    if (cronSecret && authorization === `Bearer ${cronSecret}`) {
      return;
    }
  }

  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
    const role = sessionClaims?.publicMetadata?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Redirect legacy customers to the welcome/reset-password page on first login.
  // Skip the welcome page itself and all API routes to avoid infinite loops.
  if (!isWelcomeBackRoute(req) && !isApiRoute(req)) {
    const { userId, sessionClaims } = await auth();
    const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    if (userId && meta?.needsWelcome === true) {
      return NextResponse.redirect(new URL("/welcome-back", req.url));
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
