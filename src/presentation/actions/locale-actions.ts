"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/src/lib/i18n/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function switchLocaleAction(locale: string, pathname: string) {
  const next = isLocale(locale) ? locale : DEFAULT_LOCALE;
  (await cookies()).set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  if (pathname) revalidatePath(pathname, "page");
  return next;
}