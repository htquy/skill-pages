"use server";

import { signIn, signOut } from "@/src/infrastructure/authentication/auth";

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}