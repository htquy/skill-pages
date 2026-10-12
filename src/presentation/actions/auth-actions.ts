"use server";

import { signIn, signOut } from "@/src/infrastructure/authentication/auth";

export async function signInWithGoogle(callbackUrl?: string): Promise<void> {
  await signIn("google", { redirectTo: callbackUrl || "/" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}