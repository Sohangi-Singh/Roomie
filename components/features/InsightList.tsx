import { Check, TriangleAlert, CircleAlert } from "lucide-react";

export function InsightList({
  reasons,
  annoyances,
  conflicts,
}: {
  reasons: string[];
  annoyances: string[];
  conflicts: string[];
}) {
  return (
    <div className="space-y-5">
      {reasons.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="size-4" /> Why you match
          </h3>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      {annoyances.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-warning">
            <TriangleAlert className="size-4" /> Might be a problem, but is fine
          </h3>
          <ul className="space-y-1.5">
            {annoyances.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="rounded-2xl bg-danger-soft px-4 py-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger">
            <CircleAlert className="size-4" /> Potential clashes
          </h3>
          <ul className="space-y-1.5">
            {conflicts.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
