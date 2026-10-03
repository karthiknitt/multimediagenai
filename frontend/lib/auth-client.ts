import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * Sign out, then hard-navigate to /login. A full navigation (not router.push)
 * drops all client state (zustand stores, cached session) so nothing from the
 * previous user lingers. Navigates even if the request fails: the cookie may
 * already be gone, and staying on a dashboard page would look like a no-op.
 */
export async function signOutAndRedirect(): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    console.error("Sign out failed", error);
  } finally {
    window.location.assign("/login");
  }
}
