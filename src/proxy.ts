import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth/routes";

/**
 * Checagem otimista: sem cookie de sessão, áreas logadas vão para o login.
 * A validação real da sessão e do papel acontece no servidor (DAL) e no banco (RLS).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isProtectedPath(pathname) && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/aluno/:path*", "/profissional/:path*", "/admin/:path*"],
};
