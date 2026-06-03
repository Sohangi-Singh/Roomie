import { redirect } from "next/navigation";

/**
 * Explore was merged into /matches — this route now redirects there in case
 * anyone has the old URL bookmarked.
 */
export default function ExploreRedirect() {
  redirect("/matches");
}
