"use client";

import { useSyncExternalStore } from "react";
import { en } from "./en";
import { vi } from "./vi";
import { isLocale, type Dict, type Locale } from "./config";

const dictionaries: Record<Locale, Dict> = { en, vi };

function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): Locale {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : "en";
}

function getServerSnapshot(): Locale {
  return "en";
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useDict(): Dict {
  return dictionaries[useLocale()];
}