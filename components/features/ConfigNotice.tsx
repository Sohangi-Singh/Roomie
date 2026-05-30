import { TriangleAlert } from "lucide-react";

export function ConfigNotice() {
  return (
    <div className="mt-4 flex gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
      <TriangleAlert className="size-4 shrink-0" />
      <span>
        Firebase isn&apos;t configured yet. Add your keys to{" "}
        <code className="font-mono">.env.local</code> to enable accounts.
      </span>
    </div>
  );
}
