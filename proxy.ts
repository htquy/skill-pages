import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  type Locale,
} from "@/src/lib/i18n/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function detectLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  const accepted = request.headers.get("accept-language") ?? "";
  if (accepted.toLowerCase().startsWith("vi")) return "vi";
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const locale = detectLocale(request);
  const response = NextResponse.next();
  response.headers.set(LOCALE_HEADER, locale);
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)$).*)",
  ],
};