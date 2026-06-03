"use client";

import { motion } from "framer-motion";
import type { Category } from "@/types";
import { CATEGORY_META, CATEGORIES } from "@/config/questionnaire";
import { scoreColor } from "@/config/tokens";
import { useThemeStore } from "@/stores/themeStore";
import { CategoryIcon } from "./CategoryIcon";

export function CategoryBreakdown({
  categories,
}: {
  categories: Record<Category, number>;
}) {
  const dark = useThemeStore((s) => s.theme === "dark");
  return (
    <div className="space-y-2.5">
      {CATEGORIES.map((c) => {
        const v = categories[c];
        return (
          <div key={c} className="flex items-center gap-3">
            <CategoryIcon
              name={CATEGORY_META[c].icon}
              className="size-4 shrink-0 text-accent-600"
            />
            <span className="w-20 shrink-0 text-xs text-muted">
              {CATEGORY_META[c].label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-100">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: scoreColor(v, dark) }}
                initial={{ width: 0 }}
                whileInView={{ width: `${v}%` }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium">
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}
