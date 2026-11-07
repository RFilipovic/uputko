import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "uputko_demo"; // same as lib/demo.ts (middleware runs on the edge)

/** `?demo=1` turns demo-safe mode on for this browser, `?demo=0` turns it off. */
export function middleware(req: NextRequest) {
  const demo = req.nextUrl.searchParams.get("demo");
  if (demo !== "1" && demo !== "0") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete("demo");
  const res = NextResponse.redirect(url);
  if (demo === "1")
    res.cookies.set(DEMO_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  else res.cookies.delete(DEMO_COOKIE);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|maplibre|demo/|favicon).*)"],
};
