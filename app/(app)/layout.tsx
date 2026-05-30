import { RequireAuth } from "@/components/features/RequireAuth";
import { BottomNav } from "@/components/ui";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
        {children}
      </div>
      <BottomNav />
    </RequireAuth>
  );
}
