import { RequireAuth } from "@/components/features/RequireAuth";
import { BottomNav, TopNav } from "@/components/ui";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {/* Mobile: phone-width column + bottom nav (pb-28 leaves room for it).
          Desktop (lg): wider content + top nav (pt-24 leaves room for it,
          and we drop the bottom padding since BottomNav is hidden). */}
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6 lg:max-w-3xl lg:px-8 lg:pb-12 lg:pt-24">
        {children}
      </div>
      <TopNav />
      <BottomNav />
    </RequireAuth>
  );
}
