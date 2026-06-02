import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/features/Brand";
import { ThemeToggle } from "@/components/features/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10">
      <header className="flex items-center justify-between pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Brand size="sm" />
        </div>
      </header>
      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
    </main>
  );
}
