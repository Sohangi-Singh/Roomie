"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { FullScreenLoader } from "./Loader";

/**
 * Client-side route guard. Redirects guests to /login and (optionally)
 * un-onboarded users to /onboarding.
 */
export function RequireAuth({
  children,
  requireOnboarded = true,
}: {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const needsOnboarding = requireOnboarded && (!user || !user.onboarded);

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
    } else if (status === "authed" && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [status, needsOnboarding, router]);

  if (status !== "authed" || needsOnboarding) {
    return <FullScreenLoader />;
  }
  return <>{children}</>;
}
