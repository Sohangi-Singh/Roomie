import { RequireAuth } from "@/components/features/RequireAuth";
import { BottomNav } from "@/components/ui";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {/* Mobile-first column. Widens on lg so desktop users get breathing
          room without redesigning the mobile experience. */}
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6 lg:max-w-3xl lg:px-8">
        {children}
      </div>
      <BottomNav />
    </RequireAuth>
  );
}
