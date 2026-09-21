import { headers, cookies } from "next/headers";
import { en } from "./en";
import { vi } from "./vi";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  trans,
  type Dict,
  type Locale,
} from "./config";

const dictionaries: Record<Locale, Dict> = { en, vi };

export { en, vi };
export { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, trans };
export type { Dict, Locale };

export async function getLocale(): Promise<Locale> {
  const headerLocale = (await headers()).get(LOCALE_HEADER);
  if (isLocale(headerLocale)) return headerLocale;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dict> {
  return dictionaries[await getLocale()];
}